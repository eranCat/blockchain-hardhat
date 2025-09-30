
import { requireEnv, getVoting as getVotingContract, sendAndWait } from "./utils.js";

async function main() {

    const root = requireEnv("VOTER_MERKLE_ROOT") as `0x${string}`; // 0x…32 bytes
    const voting = await getVotingContract();
    const { hash } = await sendAndWait(voting.write.setMerkleRoot([root]));
    console.log("✅ Merkle root set:", root, "tx:", hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
