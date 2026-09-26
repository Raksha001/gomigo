import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi,
  keccak256, stringToHex, namehash, encodeAbiParameters, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
const RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
const VF="0x9e726eb570beb6bceb495ab8cda7df517d4e841c", IMPL="0x14f09fd05d4585759e54844dc9b00147131cf243";
const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
const factoryAbi = parseAbi(["function deployProxy(address implementation, uint256 salt, bytes data) returns (address)"]);
const bit=n=>1n<<BigInt(n); const GRANT = bit(4)|(bit(4)<<128n);
const salt = BigInt(keccak256(encodeAbiParameters([{type:"bytes32"},{type:"bytes32"},{type:"uint256"}],[keccak256(stringToHex("PermissionedResolver")), namehash("gomipass.eth"), 0n])));
const initAbi = parseAbi(["function initialize((address account, uint256 roleBitmap)[] grants)"]);
const data = encodeFunctionData({ abi: initAbi, functionName: "initialize", args: [[{ account: account.address, roleBitmap: GRANT }]] });
try {
  await pub.simulateContract({ account, address: VF, abi: factoryAbi, functionName: "deployProxy", args: [IMPL, salt, data] });
  console.log("simulate OK (would succeed)");
} catch (e) {
  const msg = e.shortMessage || e.message;
  console.log("REVERT:", msg.slice(0,200));
  const m = (e.message||"").match(/0x[0-9a-fA-F]{8}/);
  if (m) {
    const sel = m[0].slice(0,10);
    try { const r=await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?function=${sel}&filter=true`); const j=await r.json(); console.log("selector",sel,"=",JSON.stringify(j.result?.function?.[sel]||"unknown")); } catch{}
  }
}
