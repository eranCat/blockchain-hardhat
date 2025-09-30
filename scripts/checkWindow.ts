// scripts/checkWindow.ts
import { getVoting as getVotingContract } from "./utils.js";


function toIso(sec: bigint | number): string {
    const n = typeof sec === "bigint" ? Number(sec) : sec;
    return new Date(n * 1000).toISOString();
}

async function main() {
    

    const voting = await getVotingContract();

    try {
        const [start, end] = await voting.read.getWindow();
        console.log("Voting window:");
        console.log("  start:", start, "=>", toIso(start));
        console.log("  end  :", end, "=>", toIso(end));
    } catch (_e) {
        console.log("Voting window is NOT set yet (getWindow() reverted).");
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
