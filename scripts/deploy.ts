import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // Deploy BAL Token
    const BALToken = await ethers.getContractFactory("BALToken");
    const balToken = await BALToken.deploy("BAL Token", "BAL", deployer.address);
    const balTokenAddress = await balToken.getAddress();
    console.log("BAL Token:", balTokenAddress);

    // Deploy NFT
    const NFT = await ethers.getContractFactory("CandidateNFT");
    const nft = await NFT.deploy(deployer.address);
    const nftAddress = await nft.getAddress();
    console.log("NFT:", nftAddress);

    // Deploy Voting
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(balTokenAddress, 1000, nftAddress);
    const votingAddress = await voting.getAddress();
    console.log("Voting:", votingAddress);

    // Setup (wait for previous deploys to mine first)
    await balToken.deploymentTransaction()?.wait();
    await nft.deploymentTransaction()?.wait();
    await voting.deploymentTransaction()?.wait();

    console.log("\nSetting up permissions...");
    await (await balToken.setMinter(votingAddress)).wait();
    await (await nft.transferOwnership(votingAddress)).wait();

    console.log("\n✅ Deployment complete!");
    console.log(`VITE_BAL_TOKEN_CONTRACT_ADDRESS=${balTokenAddress}`);
    console.log(`VITE_VOTING_CONTRACT_ADDRESS=${votingAddress}`);
}

main().catch(console.error);