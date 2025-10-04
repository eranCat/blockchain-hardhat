import hre from "hardhat";

async function main() {
    const [deployer] = await hre.viem.getWalletClients();

    console.log("Deploying to Sepolia...");
    console.log("Deployer:", deployer.account.address);
    console.log();

    // Deploy BAL Token
    console.log("Deploying BAL Token...");
    const balToken = await hre.viem.deployContract("BALToken", [
        "BAL Token",
        "BAL",
        deployer.account.address
    ]);
    console.log("BAL Token:", balToken.address);

    // Deploy CandidateNFT
    console.log("Deploying CandidateNFT...");
    const nft = await hre.viem.deployContract("CandidateNFT", [
        deployer.account.address
    ]);
    console.log("NFT:", nft.address);

    // Deploy Voting (1000 tokens reward per vote)
    console.log("Deploying Voting...");
    const voting = await hre.viem.deployContract("Voting", [
        balToken.address,
        1000n,  // 1000 tokens reward
        nft.address
    ]);
    console.log("Voting:", voting.address);

    // Setup permissions
    console.log("\nSetting up permissions...");

    await balToken.write.setMinter([voting.address]);
    console.log("BAL minter set");

    await nft.write.transferOwnership([voting.address]);
    console.log("NFT ownership transferred");

    console.log("\n" + "=".repeat(70));
    console.log("DEPLOYMENT COMPLETE!");
    console.log("=".repeat(70));
    console.log("\nContract Addresses:");
    console.log(`VOTING_ADDR_SEPOLIA=${voting.address}`);
    console.log(`BAL_TOKEN_ADDR_SEPOLIA=${balToken.address}`);
    console.log(`CANDIDATE_NFT_ADDR=${nft.address}`);

    console.log("\nNext Steps:");
    console.log("1. Add these addresses to your .env file");
    console.log("2. Add these addresses to frontend/.env.local:");
    console.log(`   VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=${voting.address}`);
    console.log(`   VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA=${balToken.address}`);
    console.log(`   VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=${nft.address}`);
    console.log("\n3. Run setup:");
    console.log("   npx hardhat run scripts/setup.ts --network sepolia");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });