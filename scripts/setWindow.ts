// scripts/setWindow.ts
import { requireEnv, parseIsoToUnix, getVotingContract, sendAndWait } from "./utils.js";

async function main() {
    const startIso = requireEnv("ELECTION_START_ISO");
    const endIso = requireEnv("ELECTION_END_ISO");

    const startUnix = parseIsoToUnix(startIso);
    const endUnix = parseIsoToUnix(endIso);

    console.log(`Setting voting window:`);
    console.log(`  Start: ${startIso} (${startUnix})`);
    console.log(`  End:   ${endIso} (${endUnix})`);

    const voting = await getVotingContract();
    const { hash } = await sendAndWait(voting.write.setWindow([startUnix, endUnix]));

    console.log(`✅ Voting window set (tx: ${hash})`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});