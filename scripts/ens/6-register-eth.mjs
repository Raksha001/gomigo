import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { randomBytes } from "node:crypto";

const RPCS = ["https://ethereum-sepolia.publicnode.com","https://1rpc.io/sepolia","https://sepolia.drpc.org"];
const REG = "0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca";
const USDC = "0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e";
const ZERO = "0x0000000000000000000000000000000000000000";
const ZERO32 = "0x"+"00".repeat(32);
const LABEL = "gomipass";

const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function C(i){ const t=http(RPCS[i%RPCS.length]); return { pub:createPublicClient({chain:sepolia,transport:t}), wallet:createWalletClient({account,chain:sepolia,transport:t}) }; }
async function retry(fn){ let e; for(let i=0;i<6;i++){ try{ return await fn(C(i)); }catch(err){ e=err; await sleep(3500);} } throw e; }

const regAbi = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function MIN_REGISTER_DURATION() view returns (uint64)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256, uint256)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) view returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)",
]);
const erc20 = parseAbi(["function mint(address to, uint256 amount)","function approve(address spender, uint256 amount) returns (bool)","function balanceOf(address) view returns (uint256)"]);

const avail = await retry(({pub})=>pub.readContract({address:REG,abi:regAbi,functionName:"isAvailable",args:[LABEL]}));
console.log(`${LABEL}.eth available:`, avail);
if(!avail){ console.log("NAME TAKEN — aborting"); process.exit(0); }

let minDur = 0n; try{ minDur = await retry(({pub})=>pub.readContract({address:REG,abi:regAbi,functionName:"MIN_REGISTER_DURATION",args:[]})); }catch{}
const duration = BigInt(Math.max(Number(minDur), 31536000)); // >= 1 year
const [base, premium] = await retry(({pub})=>pub.readContract({address:REG,abi:regAbi,functionName:"getRegisterPrice",args:[LABEL,duration,USDC]}));
const price = base + premium;
console.log("duration:", duration.toString(), "price(USDC units):", price.toString());

// Mint generous test USDC + approve
const mintAmt = price > 0n ? price * 4n + 1000000000n : 1000000000000n;
console.log("minting test USDC…");
await retry(async ({wallet,pub})=>{ const h=await wallet.writeContract({address:USDC,abi:erc20,functionName:"mint",args:[account.address,mintAmt]}); await pub.waitForTransactionReceipt({hash:h}); });
await retry(async ({wallet,pub})=>{ const h=await wallet.writeContract({address:USDC,abi:erc20,functionName:"approve",args:[REG,mintAmt]}); await pub.waitForTransactionReceipt({hash:h}); });
const bal = await retry(({pub})=>pub.readContract({address:USDC,abi:erc20,functionName:"balanceOf",args:[account.address]}));
console.log("USDC balance:", bal.toString());

const secret = toHex(randomBytes(32));
const commitment = await retry(({pub})=>pub.readContract({address:REG,abi:regAbi,functionName:"makeCommitment",args:[LABEL,account.address,secret,ZERO,ZERO,duration,ZERO32]}));
console.log("commitment:", commitment);
await retry(async ({wallet,pub})=>{ const h=await wallet.writeContract({address:REG,abi:regAbi,functionName:"commit",args:[commitment]}); await pub.waitForTransactionReceipt({hash:h}); console.log("committed:", h); });

console.log("waiting 75s for commitment to mature…");
await sleep(75000);

console.log("registering…");
const rh = await retry(async ({wallet,pub})=>{ const h=await wallet.writeContract({address:REG,abi:regAbi,functionName:"register",args:[LABEL,account.address,secret,ZERO,ZERO,duration,USDC,ZERO32]}); const r=await pub.waitForTransactionReceipt({hash:h}); console.log("register status:", r.status, "tx:", h); return h; });

const d = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
d.ethName = "gomipass.eth"; d.ethOwner = account.address; d.ethRegisterTx = rh; d.duration = duration.toString();
fs.writeFileSync("scripts/ens/deployed.json", JSON.stringify(d,null,2));
console.log("\n✅ gomipass.eth registered to", account.address);
