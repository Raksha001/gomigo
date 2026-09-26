import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
const { registry } = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
const RESOLVER = "0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f"; // PublicResolverV2
const ZERO = "0x0000000000000000000000000000000000000000";

const bit = (n) => 1n << BigInt(n);
const REGULAR = bit(0)|bit(12)|bit(16)|bit(20)|bit(24);
const OWNER_ROLES = REGULAR | (REGULAR << 128n);

const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

const regAbi = parseAbi([
  "function register(string label, address owner, address subregistry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getState(uint256 anyId) view returns (uint8 status, uint64 expiry, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

const label = "bin-01";
const expiry = BigInt(Math.floor(Date.now()/1000) + 365*24*3600);
console.log("registry:", registry, "| registering label:", label);
try {
  const hash = await wallet.writeContract({ address: registry, abi: regAbi, functionName: "register", args: [label, account.address, ZERO, RESOLVER, OWNER_ROLES, expiry] });
  console.log("tx:", hash);
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  console.log("status:", rcpt.status, "gas:", rcpt.gasUsed);
  const anyId = BigInt(keccak256(toHex(label)));
  const state = await pub.readContract({ address: registry, abi: regAbi, functionName: "getState", args: [anyId] });
  console.log("getState:", state);
} catch (e) {
  console.error("FAILED:", (e.shortMessage || e.message || String(e)).slice(0, 500));
}
