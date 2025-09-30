import { getVoting as getVotingContract } from "./utils.js";

async function main() {
    const voting = await getVotingContract();

    // 1) owner()
    try {
        const owner = await voting.read.owner();
        console.log("owner:", owner);
    } catch (e) {
        console.error("owner() revert:", e);
    }

    // 2) candidateCount()
    try {
        const count = await voting.read.candidateCount();
        console.log("candidateCount:", count);
    } catch (e) {
        console.error("candidateCount() revert:", e);
    }

    // 3) getWindow()
    try {
        const win = await voting.read.getWindow();
        console.log("window:", win);
    } catch (e) {
        console.error("getWindow() revert:", e);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
