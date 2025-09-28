import { getVoting as getVotingContract } from "./utils.js";

async function main() {
    const voting = await getVotingContract();

    const count = Number(await voting.read.candidateCount());
    const rows: { id: number; name: string }[] = [];

    for (let i = 0; i < count; i++) {
        // Adjust if your struct returns [name, votes] etc.
        const name = await voting.read.getCandidate([BigInt(i)]);
        rows.push({ id: i, name: String(name) });
    }

    console.table(rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
