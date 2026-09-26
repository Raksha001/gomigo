import fs from "node:fs";
import {
  createPublicClient, createWalletClient, http, parseAbi, parseEventLogs,
  keccak256, stringToHex, namehash, encodeAbiParameters, encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
const VERIFIABLE_FACTORY = "0x9e726eb570beb6bceb495ab8cda7df517d4e841c";
const USER_REGISTRY_IMPL = "0xa80338aaa8d23831cea25e858d1774534abb0263";
// ENSv2 EAC roles are nybble-aligned single bits (positions 4N); admin variant is +128.
const bit = (n) => 1n << BigInt(n);
const ROLE_REGISTRAR = bit(0);
const ROLE_UNREGISTER = bit(12);
const ROLE_RENEW = bit(16);
const ROLE_SET_SUBREGISTRY = bit(20);
const ROLE_SET_RESOLVER = bit(24);
const REGULAR = ROLE_REGISTRAR | ROLE_UNREGISTER | ROLE_RENEW | ROLE_SET_SUBREGISTRY | ROLE_SET_RESOLVER;
const ALL_ROLES = REGULAR | (REGULAR << 128n); // regular + admin counterparts

const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

const initAbi = parseAbi(["function initialize((address account, uint256 roleBitmap)[] grants)"]);
const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);

const version = 0n;
const salt = BigInt(keccak256(encodeAbiParameters(
  [{type:"bytes32"},{type:"bytes32"},{type:"uint256"}],
  [keccak256(stringToHex("UserRegistry")), namehash("gomipass.eth"), version],
)));
const data = encodeFunctionData({ abi: initAbi, functionName: "initialize", args: [[{ account: account.address, roleBitmap: ALL_ROLES }]] });

console.log("deployer:", account.address);
console.log("deploying UserRegistry proxy via VerifiableFactory…");
try {
  const hash = await wallet.writeContract({ address: VERIFIABLE_FACTORY, abi: factoryAbi, functionName: "deployProxy", args: [USER_REGISTRY_IMPL, salt, data] });
  console.log("tx:", hash);
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  console.log("status:", rcpt.status, "gasUsed:", rcpt.gasUsed);
  const logs = parseEventLogs({ abi: factoryAbi, logs: rcpt.logs, eventName: "ProxyDeployed" });
  const proxy = logs[0]?.args?.proxyAddress;
  console.log("REGISTRY PROXY:", proxy);
  if (proxy) fs.writeFileSync("scripts/ens/deployed.json", JSON.stringify({ registry: proxy, salt: salt.toString() }, null, 2));
} catch (e) {
  console.error("FAILED:", (e.shortMessage || e.message || String(e)).slice(0, 400));
}
