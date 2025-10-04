// scripts/checkContract.js
const hre = require("hardhat");

async function main() {
    const contractAddress = "0x4960275Cc96bCbA0Ac5eF2976E93D1C755860e8d";

    console.log("Checking contract at:", contractAddress);
    console.log("Network:", hre.network.name);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = Voting.attach(contractAddress);

    try {
        // Check candidate count
        const count = await voting.candidateCount();
        console.log("\n✅ Candidate count:", count.toString());

        if (count > 0) {
            // Get all candidates
            const [names, positions, votes] = await voting.getAllCandidates();
            console.log("\n📋 Candidates:");
            for (let i = 0; i < names.length; i++) {
                console.log(`  ${i}: ${names[i]}`);
                console.log(`     Positions: [${positions[i].join(', ')}]`);
                console.log(`     Votes: ${votes[i].toString()}`);
            }
        } else {
            console.log("\n⚠️  No candidates set yet!");
            console.log("Run: npx hardhat run scripts/setup.ts --network sepolia");
        }

        // Check voting window
        const [start, end] = await voting.getVotingWindow();
        console.log("\n⏰ Voting Window:");
        console.log("  Start:", start.toString(), start > 0 ? `(${new Date(Number(start) * 1000).toLocaleString()})` : "(Not set)");
        console.log("  End:", end.toString(), end > 0 ? `(${new Date(Number(end) * 1000).toLocaleString()})` : "(Not set)");

        // Check Merkle root
        const root = await voting.voterRoot();
        console.log("\n🌳 Voter Root:", root === "0x0000000000000000000000000000000000000000000000000000000000000000" ? "Not set" : root);

    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });