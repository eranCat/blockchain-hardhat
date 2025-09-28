import { requireEnv, getVoting as getVotingContract, sendAndWait } from "./utils.js";

async function main() {
    const namesEnv = process.env.CANDIDATE_NAMES ?? requireEnv("CANDIDATE_NAME");
    const arr = namesEnv.split(",").map(s => s.trim()).filter(Boolean);
    if (!arr.length) throw new Error("No candidate names provided");

    const voting = await getVotingContract();
    const { hash } = await sendAndWait(voting.write.setCandidates([arr]));
    console.log(`✅ setCandidates(${arr.length}) tx:`, hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
