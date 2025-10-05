import hre from "hardhat";

async function main() {
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA!;
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = Voting.attach(votingAddr);

    console.log("📊 Contract State:");
    console.log("  Address:", votingAddr);

    const count = await voting.candidateCount();
    console.log("  Candidates:", count.toString());

    const window = await voting.getVotingWindow();
    console.log("  Start:", new Date(Number(window[0]) * 1000).toISOString());
    console.log("  End:", new Date(Number(window[1]) * 1000).toISOString());
    console.log("  Current:", new Date().toISOString());

    const root = await voting.voterRoot();
    console.log("  Merkle Root:", root);

    const now = Math.floor(Date.now() / 1000);
    const isActive = Number(window[0]) <= now && now <= Number(window[1]);
    console.log("\n  ✅ Voting Active:", isActive);
}

main().catch(console.error);