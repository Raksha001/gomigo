// Verify GomiPass's ENSv2 deployment is live on Sepolia. Run: node scripts/ens/verify.mjs
import { createPublicClient, http, parseAbi, keccak256, toHex } from "viem";
import { sepolia } from "viem/chains";
const c = createPublicClient({ chain: sepolia, transport: http("https://1rpc.io/sepolia") });
const ETHREG = "0x657ea849311d3d5823348dded7c2aaafb3ede09e";
const REG = "0x6Fdec1496fe8ff0c07b815d72A53A014d6072ff6";
const HOST = "0x1D2e4A9c9C3E7A0F2B5c6d7e8f90a1B2C3d4E5f6";
const ethAbi = parseAbi(["function getSubregistry(string) view returns (address)"]);
const regAbi = parseAbi(["function getState(uint256) view returns (uint8,uint64,uint256)","function hasRoles(uint256,uint256,address) view returns (bool)"]);
const sub = await c.readContract({ address: ETHREG, abi: ethAbi, functionName: "getSubregistry", args: ["gomipass"] });
console.log("gomipass.eth -> subregistry:", sub, sub.toLowerCase()===REG.toLowerCase()?"✅":"❌");
for (const l of ["bin-01-shibuya","bin-02-shibuya","bin-01-chiyoda","bin-01-shinjuku","bin-02-shinjuku"]) {
  const st = await c.readContract({ address: REG, abi: regAbi, functionName: "getState", args: [BigInt(keccak256(toHex(l)))] });
  console.log(`${l}.gomipass.eth -> ${st[0]===2?"REGISTERED ✅":"status "+st[0]}`);
}
const id = BigInt(keccak256(toHex("bin-01-shibuya")));
console.log("EAC host SET_RESOLVER:", await c.readContract({address:REG,abi:regAbi,functionName:"hasRoles",args:[id,1n<<24n,HOST]}),
            "| REGISTRAR:", await c.readContract({address:REG,abi:regAbi,functionName:"hasRoles",args:[id,1n<<0n,HOST]}));
