import hre from "hardhat";

async function main() {
    const balTokenAddr = process.env.BAL_TOKEN_ADDR_SEPOLIA!;
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA!;

    if (!balTokenAddr || !votingAddr) {
        throw new Error("BAL_TOKEN_ADDR_SEPOLIA or VOTING_ADDR_SEPOLIA not set in .env");
    }

    console.log("Setting minter for:");
    console.log("  BAL Token:", balTokenAddr);
    console.log("  Voting:", votingAddr);

    const BALToken = await hre.ethers.getContractAt("BALToken", balTokenAddr);
    const tx = await BALToken.setMinter(votingAddr);
    console.log("Tx:", tx.hash);

    await tx.wait();
    console.log("✅ Minter set");
}

main().catch(console.error);