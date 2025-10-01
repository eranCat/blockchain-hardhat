import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as fs from "fs";

async function main() {
    const balToken = process.env.BAL_TOKEN_ADDR_SEPOLIA as `0x${string}`;
    const voting = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;
    const account = privateKeyToAccount(process.env.SEPOLIA_PRIVATE_KEY as `0x${string}`);

    const wallet = createWalletClient({
        account,
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL)
    });

    const balAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/BALToken.sol/BALToken.json", "utf8")
    ).abi;

    const hash = await wallet.writeContract({
        address: balToken,
        abi: balAbi,
        functionName: "setMinter",
        args: [voting]
    });

    console.log(`✅ Minter granted: ${hash}`);
}

main().catch(console.error);