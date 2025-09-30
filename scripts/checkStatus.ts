// scripts/checkStatus.ts
import { getVoting as getVotingContract } from "./utils.js";


async function main() {
    const voting = await getVotingContract();
    const owner = await voting.read.owner();
    const count = await voting.read.candidateCount();
    const root = await voting.read.voterRoot();

    console.log({ owner, candidateCount: count, voterRoot: root });

    try {
        const [s, e] = await voting.read.getWindow();
        console.log("window:", Number(s), "→", Number(e));
    } catch {
        console.log("window: <NOT SET> (getWindow() reverted)");
    }

    // Try reading candidates one-by-one (your bytecode may not support getCandidates())
    const n = Number(count);
    const names: string[] = [];
    for (let i = 0; i < n; i++) {
        const [name] = await voting.read.getCandidate([BigInt(i)]);
        names.push(name);
    }
    console.log("candidates:", names);
}
main().catch((e) => { console.error(e); process.exit(1); });
