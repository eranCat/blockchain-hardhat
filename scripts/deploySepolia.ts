import hre from "hardhat";

async function main() {
    try {
        const balTokenAddr = "0x7307418690bf2De4DdE9590032857152F96d447D";
        const rewardAmount = hre.ethers.parseEther("1000");

        console.log("Deploying...");
        const Voting = await hre.ethers.getContractFactory("Voting");

        console.log("Sending transaction...");
        const voting = await Voting.deploy(balTokenAddr, rewardAmount);

        console.log("Transaction hash:", voting.deploymentTransaction()?.hash);
        console.log("Waiting for confirmation (this may take 1-2 minutes)...");

        // Wait with timeout
        const address = await Promise.race([
            voting.getAddress(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout after 3 minutes")), 180000)
            )
        ]) as string;

        console.log("\n✅ Deployed to:", address);

        // Set minter
        console.log("\nSetting minter...");
        const BALToken = await hre.ethers.getContractAt("BALToken", balTokenAddr);
        const tx = await BALToken.setMinter(address);
        await tx.wait();
        console.log("✅ Minter set");

        console.log("\n" + "=".repeat(70));
        console.log("UPDATE .env FILES:");
        console.log("=".repeat(70));
        console.log(`\nVOTING_ADDR_SEPOLIA=${address}`);
        console.log(`VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=${address}`);

    } catch (error: any) {
        console.error("\n❌ Error:", error.message);

        if (error.message.includes("Timeout")) {
            console.log("\nCheck transaction status:");
            console.log("https://sepolia.etherscan.io");
        }
    }
}

main().catch(console.error);