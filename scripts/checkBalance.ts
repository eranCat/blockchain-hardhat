import hre from "hardhat";

async function main() {
    const balTokenAddr = process.env.BAL_TOKEN_ADDR_SEPOLIA as `0x${string}`;
    const balToken = await hre.viem.getContractAt("BALToken", balTokenAddr);

    const address = process.argv[2] as `0x${string}` || process.env.VOTER_ADDR as `0x${string}`;

    if (!address) {
        throw new Error("Usage: npx hardhat run scripts/checkBalance.ts -- 0xAddress");
    }

    console.log("\n💰 BAL Token Balance\n");

    const balance = await balToken.read.balanceOf([address]);
    const decimals = await balToken.read.decimals();
    const symbol = await balToken.read.symbol();

    console.log(`Address: ${address}`);
    console.log(`Balance: ${hre.viem.formatUnits(balance, decimals)} ${symbol}`);
    console.log();
}

main().catch(console.error);