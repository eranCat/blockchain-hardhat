import hre from "hardhat";

async function main() {
    const balTokenAddr = "0xdb4c02e1f11f512fcf0220060a9428b4f056c8ad";
    const rewardAmount = hre.ethers.parseEther("10");

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(balTokenAddr, rewardAmount);
    await voting.waitForDeployment();
    const votingAddr = await voting.getAddress();
    console.log("Voting:", votingAddr);

    // Set minter
    const BALToken = await hre.ethers.getContractAt("BALToken", balTokenAddr);
    await (await BALToken.setMinter(votingAddr)).wait();
    console.log("✅ Minter set");

    console.log(`\nVOTING_ADDR_SEPOLIA=${votingAddr}`);
}

main().catch(console.error);