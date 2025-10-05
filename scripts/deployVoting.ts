import hre from "hardhat";

async function main() {
    console.log("Starting deployment...");
    const balTokenAddr = "0xdb4c02e1f11f512fcf0220060a9428b4f056c8ad";
    const rewardAmount = hre.ethers.parseEther("10");

    console.log("Deploying Voting contract...");
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(balTokenAddr, rewardAmount);
    console.log("Waiting for deployment...");
    await voting.waitForDeployment();
    const votingAddr = await voting.getAddress();
    console.log("Voting deployed:", votingAddr);

    console.log("Setting minter...");
    const BALToken = await hre.ethers.getContractAt("BALToken", balTokenAddr);
    const tx = await BALToken.setMinter(votingAddr);
    await tx.wait();
    console.log("✅ Complete");

    console.log(`\nVOTING_ADDR_SEPOLIA=${votingAddr}`);
}

main().catch(console.error);