import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPCS = ["https://ethereum-sepolia.publicnode.com","https://1rpc.io/sepolia"];
const ETH_REGISTRY = "0x657ea849311d3d5823348dded7c2aaafb3ede09e";
const { registry } = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function C(i){ const t=http(RPCS[i%RPCS.length]); return { pub:createPublicClient({chain:sepolia,transport:t}), wallet:createWalletClient({account,chain:sepolia,transport:t}) }; }
async function retry(fn){ let e; for(let i=0;i<6;i++){ try{ return await fn(C(i)); }catch(err){ e=err; await sleep(3500);} } throw e; }

const abi = parseAbi([
  "function setSubregistry(uint256 anyId, address registry)",
  "function getSubregistry(string label) view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);
const anyId = BigInt(keccak256(toHex("gomipass")));

const owner = await retry(({pub})=>pub.readContract({address:ETH_REGISTRY,abi,functionName:"ownerOf",args:[anyId]}));
console.log("gomipass.eth owner:", owner, "(us:", account.address+")");

console.log("setSubregistry(gomipass -> our registry", registry, ")…");
await retry(async ({wallet,pub})=>{ const h=await wallet.writeContract({address:ETH_REGISTRY,abi,functionName:"setSubregistry",args:[anyId,registry]}); const r=await pub.waitForTransactionReceipt({hash:h}); console.log("status:",r.status,"tx:",h); });

const sub = await retry(({pub})=>pub.readContract({address:ETH_REGISTRY,abi,functionName:"getSubregistry",args:["gomipass"]}));
console.log("gomipass.eth subregistry now:", sub);
console.log("MATCH:", sub.toLowerCase()===registry.toLowerCase() ? "✅ wired — *.gomipass.eth routes to our registry" : "⚠️ mismatch");
