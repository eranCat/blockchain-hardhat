import { requireEnv, getCandidateNft as getCandidateNftContract, sendAndWait } from "./utils.js";

async function main() {
    const to = requireEnv("TO_ADDR") as `0x${string}`; // 0x…20 bytes
    const uri = process.env.TOKEN_URI ?? ""; // your metadata URL/IPFS

    const nft = await getCandidateNftContract();
    const { hash } = await sendAndWait(nft.write.mint([to, uri]));
    console.log(`✅ Minted to ${to} (tx: ${hash})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
