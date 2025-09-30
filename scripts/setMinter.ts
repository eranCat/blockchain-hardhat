// scripts/setMinter.ts
import { requireEnv, sendAndWait } from "./utils.js";
import { network } from "hardhat";
import type { Address } from "viem";

async function main() {
    // Get addresses
    const networkArg = process.argv.find((arg, i) =>
        process.argv[i - 1] === "--network"
    )?.toUpperCase();

    const balTokenKey = networkArg ? `BAL_TOKEN_ADDR_${networkArg}` : "";
    const balTokenAddr = (
        (balTokenKey && process.env[balTokenKey]) ||
        process.env.BAL_TOKEN_ADDR ||
        ""
    ).trim() as Address;

    const votingKey = networkArg ? `VOTING_ADDR_${networkArg}` : "";
    const votingAddr = (
        (votingKey && process.env[votingKey]) ||
        process.env.VOTING_ADDR ||
        ""
    ).trim() as Address;

    if (!balTokenAddr || !votingAddr) {
        throw new Error("Missing BAL_TOKEN_ADDR or VOTING_ADDR");
    }

    console.log(`Setting minter on BALToken ${balTokenAddr}`);
    console.log(`  Minter: ${votingAddr}`);

    const { viem } = await network.connect();
    const balToken = await viem.getContractAt("BALToken", balTokenAddr);

    const { hash } = await sendAndWait(balToken.write.setMinter([votingAddr]));

    console.log(`✅ Minter set (tx: ${hash})`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});