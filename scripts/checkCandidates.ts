// scripts/checkCandidates.ts

import { getVoting as getVotingContract } from "./utils.js";

async function main() {

    const voting = await getVotingContract();

    // Try bulk read first (if your deployed bytecode supports it)
    try {
        const names = await voting.read.getCandidates();
        console.log("Candidates:", names);
        return;
    } catch {
        // fall through
    }

    // Fallback: read count + each candidate by index
    const count = await voting.read.candidateCount();
    const names: string[] = [];
    for (let i = 0; i < Number(count); i++) {
        // assuming getCandidate(uint256) returns (string name, /* maybe other fields */)
        const [name] = await voting.read.getCandidate([BigInt(i)]);
        names.push(name);
    }
    console.log("Candidates:", names);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
