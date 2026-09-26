import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
const { registry } = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
const RESOLVER = "0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f";
const ZERO = "0x0000000000000000000000000000000000000000";
const HOST = "0x1D2e4A9c9C3E7A0F2B5C6d7E8f90A1b2C3d4E5f6"; // demo host address (EAC delegate)

const bit=n=>1n<<BigInt(n);
const REGULAR = bit(0)|bit(12)|bit(16)|bit(20)|bit(24);
const OWNER_ROLES = REGULAR | (REGULAR<<128n);
const ROLE_SET_RESOLVER = bit(24); // the single right we delegate to the host

const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

const abi = parseAbi([
  "function register(string label, address owner, address subregistry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getState(uint256 anyId) view returns (uint8 status, uint64 expiry, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function grantRoles(uint256 anyId, uint256 roleBitmap, address account) returns (bool)",
  "function hasRoles(uint256 anyId, uint256 roleBitmap, address account) view returns (bool)",
]);

const labels = ["bin-01-shibuya","bin-02-shibuya","bin-01-chiyoda","bin-01-shinjuku","bin-02-shinjuku"];
const expiry = BigInt(Math.floor(Date.now()/1000) + 365*24*3600);
const out = {};

for (const label of labels) {
  const anyId = BigInt(keccak256(toHex(label)));
  const st0 = await pub.readContract({ address: registry, abi, functionName: "getState", args: [anyId] });
  if (st0[0] === 2) { console.log(label, "already registered (status 2)"); out[label]={tokenId:st0[2].toString(), status:st0[0], expiry:st0[1].toString()}; continue; }
  try {
    const h = await wallet.writeContract({ address: registry, abi, functionName: "register", args: [label, account.address, ZERO, RESOLVER, OWNER_ROLES, expiry] });
    await pub.waitForTransactionReceipt({ hash: h });
    const st = await pub.readContract({ address: registry, abi, functionName: "getState", args: [anyId] });
    console.log(label, "-> status", st[0], "tokenId", st[2].toString().slice(0,12)+"…");
    out[label]={tokenId:st[2].toString(), status:st[0], expiry:st[1].toString()};
  } catch (e) { console.error(label, "FAILED:", (e.shortMessage||e.message).slice(0,160)); }
}

// EAC demo: delegate ONLY ROLE_SET_RESOLVER on bin-01-shibuya to the host address.
try {
  const anyId = BigInt(keccak256(toHex("bin-01-shibuya")));
  console.log("\nEAC: granting ROLE_SET_RESOLVER on bin-01-shibuya to host", HOST);
  const h = await wallet.writeContract({ address: registry, abi, functionName: "grantRoles", args: [anyId, ROLE_SET_RESOLVER, HOST] });
  const r = await pub.waitForTransactionReceipt({ hash: h });
  console.log("grantRoles status:", r.status);
  try {
    const has = await pub.readContract({ address: registry, abi, functionName: "hasRoles", args: [anyId, ROLE_SET_RESOLVER, HOST] });
    console.log("hasRoles(host, ROLE_SET_RESOLVER):", has);
    const hasReg = await pub.readContract({ address: registry, abi, functionName: "hasRoles", args: [anyId, bit(0), HOST] });
    console.log("hasRoles(host, ROLE_REGISTRAR):", hasReg, "(should be false — scoped delegation)");
  } catch(e){ console.log("hasRoles read n/a:", (e.shortMessage||e.message).slice(0,80)); }
} catch (e) { console.error("grantRoles FAILED:", (e.shortMessage||e.message).slice(0,200)); }

fs.writeFileSync("scripts/ens/bins.json", JSON.stringify(out,null,2));
console.log("\nsaved scripts/ens/bins.json");
