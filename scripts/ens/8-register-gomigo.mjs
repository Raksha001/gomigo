import fs from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { randomBytes } from "node:crypto";

const RPCS = ["https://ethereum-sepolia.publicnode.com","https://1rpc.io/sepolia","https://sepolia.drpc.org"];
const ETHREGISTRAR = "0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca";
const ETH_REGISTRY = "0x657ea849311d3d5823348dded7c2aaafb3ede09e";
const USDC = "0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e";
const ZERO = "0x0000000000000000000000000000000000000000";
const ZERO32 = "0x"+"00".repeat(32);
const LABEL = "gomigo";
const { registry } = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
const pk = fs.readFileSync(".env.local","utf8").split("\n").find(l=>l.startsWith("DEPLOYER_PRIVATE_KEY=")).split("=")[1].trim();
const account = privateKeyToAccount(pk);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function C(i){const t=http(RPCS[i%RPCS.length]);return{pub:createPublicClient({chain:sepolia,transport:t}),wallet:createWalletClient({account,chain:sepolia,transport:t})};}
async function retry(fn){let e;for(let i=0;i<8;i++){try{return await fn(C(i));}catch(err){e=err;await sleep(3000);}}throw e;}

const regAbi = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256, uint256)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) view returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)",
]);
const erc20 = parseAbi(["function mint(address to, uint256 amount)","function approve(address spender, uint256 amount) returns (bool)"]);
const eth = parseAbi(["function setSubregistry(uint256 anyId, address registry)","function getSubregistry(string label) view returns (address)"]);

const avail = await retry(({pub})=>pub.readContract({address:ETHREGISTRAR,abi:regAbi,functionName:"isAvailable",args:[LABEL]}));
console.log(LABEL+".eth available:", avail);
if(!avail){ console.log("already registered — will just (re)wire subregistry"); }

const duration = 31536000n;
if (avail) {
  const [base,prem] = await retry(({pub})=>pub.readContract({address:ETHREGISTRAR,abi:regAbi,functionName:"getRegisterPrice",args:[LABEL,duration,USDC]}));
  const price = base+prem, mintAmt = price*4n + 1000000000n;
  await retry(async({wallet,pub})=>{const h=await wallet.writeContract({address:USDC,abi:erc20,functionName:"mint",args:[account.address,mintAmt]});await pub.waitForTransactionReceipt({hash:h});});
  await retry(async({wallet,pub})=>{const h=await wallet.writeContract({address:USDC,abi:erc20,functionName:"approve",args:[ETHREGISTRAR,mintAmt]});await pub.waitForTransactionReceipt({hash:h});});
  const secret = toHex(randomBytes(32));
  const commitment = await retry(({pub})=>pub.readContract({address:ETHREGISTRAR,abi:regAbi,functionName:"makeCommitment",args:[LABEL,account.address,secret,ZERO,ZERO,duration,ZERO32]}));
  await retry(async({wallet,pub})=>{const h=await wallet.writeContract({address:ETHREGISTRAR,abi:regAbi,functionName:"commit",args:[commitment]});await pub.waitForTransactionReceipt({hash:h});console.log("committed:",h);});
  console.log("waiting 75s…"); await sleep(75000);
  const rh = await retry(async({wallet,pub})=>{const h=await wallet.writeContract({address:ETHREGISTRAR,abi:regAbi,functionName:"register",args:[LABEL,account.address,secret,ZERO,ZERO,duration,USDC,ZERO32]});await pub.waitForTransactionReceipt({hash:h});return h;});
  console.log("registered gomigo.eth tx:", rh);
}

// Wire gomigo.eth -> our registry
const anyId = BigInt(keccak256(toHex(LABEL)));
const wh = await retry(async({wallet,pub})=>{const h=await wallet.writeContract({address:ETH_REGISTRY,abi:eth,functionName:"setSubregistry",args:[anyId,registry]});await pub.waitForTransactionReceipt({hash:h});return h;});
const sub = await retry(({pub})=>pub.readContract({address:ETH_REGISTRY,abi:eth,functionName:"getSubregistry",args:[LABEL]}));
console.log("setSubregistry tx:", wh);
console.log("gomigo.eth subregistry:", sub, sub.toLowerCase()===registry.toLowerCase()?"✅":"❌");
const d = JSON.parse(fs.readFileSync("scripts/ens/deployed.json","utf8"));
d.ethName2 = "gomigo.eth"; d.gomigoWireTx = wh; fs.writeFileSync("scripts/ens/deployed.json", JSON.stringify(d,null,2));
