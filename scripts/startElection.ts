import { requireEnv, parseIsoToUnix, getVoting as getVotingContract, sendAndWait } from "./utils.js";

async function main() {
    const startTs = parseIsoToUnix(requireEnv("ELECTION_START_ISO"));
    const endTs = parseIsoToUnix(requireEnv("ELECTION_END_ISO"));
    if (endTs <= startTs) throw new Error("END must be after START");

    const voting = await getVotingContract();
    const { hash } = await sendAndWait(voting.write.setWindow([startTs, endTs]));
    console.log(`✅ Window set: ${startTs} → ${endTs} (tx: ${hash})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
