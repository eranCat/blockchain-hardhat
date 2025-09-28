import { requireEnv, loadProofFor, getVoting as getVotingContract, sendAndWait } from "./utils.js";

async function main() {
    const voter = requireEnv("VOTER_ADDR").toLowerCase();
    const candidateId = BigInt(requireEnv("CANDIDATE_ID"));
    const proof = loadProofFor(voter);

    const voting = await getVotingContract();
    const { hash } = await sendAndWait(voting.write.vote([candidateId, proof]));
    console.log(`✅ Vote cast for candidate ${candidateId} by ${voter} (tx: ${hash})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
