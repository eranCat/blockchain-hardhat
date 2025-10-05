import hre from "hardhat";

async function main() {
    console.log("Starting setup...");

    const votingAddr = process.env.VOTING_ADDR_SEPOLIA!;
    if (!votingAddr) throw new Error("VOTING_ADDR_SEPOLIA not set");

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = Voting.attach(votingAddr);

    // 1. Set candidates
    const names = ["Alice", "Bob", "Charlie"];
    const positions = [[3, 7, 5], [7, 3, 8], [5, 5, 3]];

    console.log("Setting candidates...");
    try {
        const tx1 = await voting.setCandidates(names, positions);
        console.log("Tx sent:", tx1.hash);
        console.log("Waiting for confirmation (30s timeout)...");

        await Promise.race([
            tx1.wait(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
        ]);
        console.log("✅ Candidates set");
    } catch (e: any) {
        console.log("⚠️ Error:", e.message);
        if (e.message.includes("Timeout")) {
            console.log("Check tx: https://sepolia.etherscan.io/tx/" + (await voting.setCandidates.staticCall(names, positions)));
        }
    }

    // 2. Set voting window
    const now = Math.floor(Date.now() / 1000);
    const start = now;
    const end = now + (30 * 24 * 60 * 60);

    console.log("\nSetting voting window...");
    try {
        const tx2 = await voting.setVotingWindow(start, end);
        console.log("Tx sent:", tx2.hash);
        await Promise.race([
            tx2.wait(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
        ]);
        console.log("✅ Window set");
    } catch (e: any) {
        console.log("⚠️ Error:", e.message);
    }

    // 3. Set Merkle root
    const root = process.env.VOTER_MERKLE_ROOT;
    if (!root) {
        console.log("❌ VOTER_MERKLE_ROOT not set");
        process.exit(1);
    }

    console.log("\nSetting merkle root...");
    try {
        const tx3 = await voting.setVoterRoot(root);
        console.log("Tx sent:", tx3.hash);
        await Promise.race([
            tx3.wait(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
        ]);
        console.log("✅ Root set");
    } catch (e: any) {
        console.log("⚠️ Error:", e.message);
    }

    console.log("\n✅ Setup complete! Run checkState.ts to verify");
}

main().catch(console.error);