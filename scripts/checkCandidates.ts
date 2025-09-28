import { getVoting as getVotingContract } from "./utils.js";

async function main() {
    const voting = await getVotingContract();
    const names: string[] = await voting.read.getCandidates() as string[];
    console.log("Candidates:", names);
}

main().catch((e) => { console.error(e); process.exit(1); });
