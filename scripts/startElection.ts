import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as fs from "fs";

async function main() {
    const votingAddress = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;
    const account = privateKeyToAccount(process.env.SEPOLIA_PRIVATE_KEY as `0x${string}`);

    const wallet = createWalletClient({
        account,
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL)
    });

    const votingAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/Voting.sol/Voting.json", "utf8")
    ).abi;

    const startISO = process.env.ELECTION_START_ISO || new Date(Date.now() + 60000).toISOString();
    const endISO = process.env.ELECTION_END_ISO || new Date(Date.now() + 3600000).toISOString();

    const start = BigInt(Math.floor(new Date(startISO).getTime() / 1000));
    const end = BigInt(Math.floor(new Date(endISO).getTime() / 1000));

    console.log(`Setting window: ${startISO} to ${endISO}`);

    const hash = await wallet.writeContract({
        address: votingAddress,
        abi: votingAbi,
        functionName: "setWindow",
        args: [start, end]
    });

    console.log(`✅ ${hash}`);
}

main().catch(console.error);