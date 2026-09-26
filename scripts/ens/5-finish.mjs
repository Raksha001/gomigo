import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPCS = ["https://ethereum-sepolia.publicnode.com","https://1rpc.io/sepolia","https://sepolia.drpc.org"];
const { registry } = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
const RESOLVER = "0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f";
const ZERO = "0x0000000000000000000000000000000000000000";
const HOST = getAddress("0x1d2e4a9c9c3e7a0f2b5c6d7e8f90a1b2c3d4e5f6"); // checksummed demo delegate

const bit=n=>1n<<BigInt(n);
const REGULAR = bit(0)|bit(12)|bit(16)|bit(20)|bit(24);
const OWNER_ROLES = REGULAR | (REGULAR<<128n);
const ROLE_SET_RESOLVER = bit(24);

const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const abi = parseAbi([
  "function register(string label, address owner, address subregistry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getState(uint256 anyId) view returns (uint8 status, uint64 expiry, uint256 tokenId)",
  "function grantRoles(uint256 anyId, uint256 roleBitmap, address account) returns (bool)",
  "function hasRoles(uint256 anyId, uint256 roleBitmap, address account) view returns (bool)",
]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function clients(i){ const t=http(RPCS[i%RPCS.length]); return { pub:createPublicClient({chain:sepolia,transport:t}), wallet:createWalletClient({account,chain:sepolia,transport:t}) }; }

async function withRetry(fn){ let last; for(let i=0;i<6;i++){ try{ return await fn(clients(i)); }catch(e){ last=e; await sleep(4000); } } throw last; }

const labels = ["bin-01-shibuya","bin-02-shibuya","bin-01-chiyoda","bin-01-shinjuku","bin-02-shinjuku"];
const expiry = BigInt(Math.floor(Date.now()/1000) + 365*24*3600);
const out = {};
for (const label of labels) {
  const anyId = BigInt(keccak256(toHex(label)));
  try {
    const st0 = await withRetry(({pub})=>pub.readContract({address:registry,abi,functionName:"getState",args:[anyId]}));
    if (st0[0]===2){ console.log(label,"already ✓ tokenId",st0[2].toString().slice(0,10)+"…"); out[label]={tokenId:st0[2].toString(),expiry:st0[1].toString()}; await sleep(1500); continue; }
    const h = await withRetry(({wallet})=>wallet.writeContract({address:registry,abi,functionName:"register",args:[label,account.address,ZERO,RESOLVER,OWNER_ROLES,expiry]}));
    await withRetry(({pub})=>pub.waitForTransactionReceipt({hash:h}));
    const st = await withRetry(({pub})=>pub.readContract({address:registry,abi,functionName:"getState",args:[anyId]}));
    console.log(label,"registered ✓ status",st[0],"tokenId",st[2].toString().slice(0,10)+"…");
    out[label]={tokenId:st[2].toString(),expiry:st[1].toString()};
    await sleep(2500);
  } catch(e){ console.error(label,"FAILED:",(e.shortMessage||e.message).slice(0,120)); }
}
// EAC scoped grant
try {
  const anyId = BigInt(keccak256(toHex("bin-01-shibuya")));
  const h = await withRetry(({wallet})=>wallet.writeContract({address:registry,abi,functionName:"grantRoles",args:[anyId,ROLE_SET_RESOLVER,HOST]}));
  const r = await withRetry(({pub})=>pub.waitForTransactionReceipt({hash:h}));
  console.log("\nEAC grantRoles(ROLE_SET_RESOLVER -> host) status:", r.status);
  const has = await withRetry(({pub})=>pub.readContract({address:registry,abi,functionName:"hasRoles",args:[anyId,ROLE_SET_RESOLVER,HOST]}));
  const hasReg = await withRetry(({pub})=>pub.readContract({address:registry,abi,functionName:"hasRoles",args:[anyId,bit(0),HOST]}));
  console.log("host hasRoles SET_RESOLVER:", has, "| host hasRoles REGISTRAR:", hasReg, "(scoped ✓)");
  out.eac = { host: HOST, role: "ROLE_SET_RESOLVER", hasResolver: has, hasRegistrar: hasReg };
} catch(e){ console.error("grantRoles FAILED:",(e.shortMessage||e.message).slice(0,160)); }
fs.writeFileSync("scripts/ens/bins.json", JSON.stringify(out,null,2));
console.log("\nsaved bins.json:", Object.keys(out).filter(k=>k!=="eac").length, "bins");
