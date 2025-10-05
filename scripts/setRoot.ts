// scripts/setRoot.ts
import hre from "hardhat";

async function main() {
    const root = process.env.VOTER_MERKLE_ROOT;
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA;

    if (!root) throw new Error("VOTER_MERKLE_ROOT not set");
    if (!votingAddr) throw new Error("VOTING_ADDR_SEPOLIA not set");

    console.log("Setting root:", root);
    const voting = await hre.ethers.getContractAt("Voting", votingAddr);
    const tx = await voting.setVoterRoot(root);
    await tx.wait();
    console.log("✅ Root set");
}

main().catch(console.error);