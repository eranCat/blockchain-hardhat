// scripts/setup.ts - add error handling
import hre from "hardhat";

async function main() {
    console.log("Starting setup...");

    const votingAddr = "0x7022a518d4f19eb0bd610d45b4a91d171eb5bc82";
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = Voting.attach(votingAddr);

    const names = ["Alice", "Bob", "Charlie"];
    const positions = [[3, 7, 5], [7, 3, 8], [5, 5, 3]];

    console.log("Setting candidates...");
    const tx1 = await voting.setCandidates(names, positions);
    await tx1.wait();
    console.log("✅ Candidates set");

    const now = Math.floor(Date.now() / 1000);
    console.log("Setting voting window...");
    const tx2 = await voting.setVotingWindow(now, now + 30 * 24 * 60 * 60);
    await tx2.wait();
    console.log("✅ Voting window set");

    const root = process.env.VOTER_MERKLE_ROOT;
    if (root) {
        console.log("Setting merkle root...");
        const tx3 = await voting.setVoterRoot(root);
        await tx3.wait();
        console.log("✅ Merkle root set");
    }

    console.log("Setup complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });