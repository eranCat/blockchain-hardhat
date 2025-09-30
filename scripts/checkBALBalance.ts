// scripts/checkBALBalance.ts
import { requireEnv } from "./utils.js";
import { network } from "hardhat";
import type { Address } from "viem";

async function main() {
    // Resolve network-specific address
    const networkArg = process.argv.find((arg, i) =>
        process.argv[i - 1] === "--network"
    )?.toUpperCase();

    const scopedKey = networkArg ? `BAL_TOKEN_ADDR_${networkArg}` : "";
    const balTokenAddr = (
        (scopedKey && process.env[scopedKey]) ||
        process.env.BAL_TOKEN_ADDR ||
        ""
    ).trim() as Address;

    if (!balTokenAddr) {
        throw new Error(`Missing env: ${scopedKey || "BAL_TOKEN_ADDR"}`);
    }

    const voterAddr = requireEnv("VOTER_ADDR") as Address;

    const { viem } = await network.connect();
    const balToken = await viem.getContractAt("BALToken", balTokenAddr);

    const balance = await balToken.read.balanceOf([voterAddr]);
    const decimals = await balToken.read.decimals();
    const symbol = await balToken.read.symbol();

    console.log(`\n💰 BAL Token Balance for ${voterAddr}:`);
    console.log(`   ${balance} wei (${Number(balance) / 10 ** Number(decimals)} ${symbol})\n`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});