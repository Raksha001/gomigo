import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, parseEventLogs,
  keccak256, stringToHex, namehash, encodeAbiParameters, encodeFunctionData } from "viem";
import { packetToBytes } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
const VERIFIABLE_FACTORY = "0x9e726eb570beb6bceb495ab8cda7df517d4e841c";
const PERM_RESOLVER_IMPL = "0x14f09fd05d4585759e54844dc9b00147131cf243";
const d = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));

const bit = (n) => 1n << BigInt(n);
const ROLE_SET_TEXT = bit(4);
const GRANT = ROLE_SET_TEXT | (ROLE_SET_TEXT << 128n);

const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);
const initAbi = parseAbi(["function initialize((address account, uint256 roleBitmap)[] grants)"]);

let resolver = d.resolver;
if (!resolver) {
  const salt = BigInt(keccak256(encodeAbiParameters(
    [{type:"bytes32"},{type:"bytes32"},{type:"uint256"}],
    [keccak256(stringToHex("PermissionedResolver")), namehash("gomipass.eth"), 0n])));
  const data = encodeFunctionData({ abi: initAbi, functionName: "initialize", args: [[{ account: account.address, roleBitmap: GRANT }]] });
  console.log("deploying Permissioned Resolver proxy…");
  const hash = await wallet.writeContract({ address: VERIFIABLE_FACTORY, abi: factoryAbi, functionName: "deployProxy", args: [PERM_RESOLVER_IMPL, salt, data] });
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  resolver = parseEventLogs({ abi: factoryAbi, logs: rcpt.logs, eventName: "ProxyDeployed" })[0]?.args?.proxyAddress;
  console.log("RESOLVER:", resolver, "status:", rcpt.status);
  d.resolver = resolver; fs.writeFileSync("scripts/ens/deployed.json", JSON.stringify(d,null,2));
}

// Try setText on our resolver for bin-01.shibuya.gomipass.eth
const resAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
  "function text(bytes32 node, string key) view returns (string)",
]);
const fqn = "bin-01.shibuya.gomipass.eth";
const dnsName = ("0x"+Buffer.from(packetToBytes(fqn)).toString("hex"));
const node = namehash(fqn);
try {
  console.log("setText bin-status=AVAILABLE on", fqn);
  const h = await wallet.writeContract({ address: resolver, abi: resAbi, functionName: "setText", args: [dnsName, "bin-status", "AVAILABLE"] });
  const r = await pub.waitForTransactionReceipt({ hash: h });
  console.log("setText status:", r.status, "gas:", r.gasUsed);
  try {
    const v = await pub.readContract({ address: resolver, abi: resAbi, functionName: "text", args: [node, "bin-status"] });
    console.log("read text(node,key):", JSON.stringify(v));
  } catch(e){ console.log("direct text() getter not available:", (e.shortMessage||e.message).slice(0,80)); }
} catch (e) {
  console.error("setText FAILED:", (e.shortMessage || e.message || String(e)).slice(0, 400));
}
