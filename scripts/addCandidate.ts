import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as fs from "fs";

async function main() {
    const votingAddress = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;
    if (!votingAddress) throw new Error("VOTING_ADDR_SEPOLIA not set");

    const account = privateKeyToAccount(process.env.SEPOLIA_PRIVATE_KEY as `0x${string}`);

    const client = createWalletClient({
        account,
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL),
    });

    const abi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/Voting.sol/Voting.json", "utf8")
    ).abi;

    const names = ["Alice Johnson", "Bob Smith", "Charlie Davis"];
    const positions = [[8, 3, 6], [2, 9, 4], [5, 5, 8]];

    for (let i = 0; i < names.length; i++) {
        console.log(`${names[i]} [${positions[i].join(", ")}]`);
        const hash = await client.writeContract({
            address: votingAddress,
            abi,
            functionName: "addCandidate",
            args: [names[i], positions[i]],
        });
        console.log(`✅ ${hash}\n`);
    }
}

main().catch(console.error);