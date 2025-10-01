import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import * as fs from "fs";

async function main() {
    const votingAddress = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL)
    });

    const votingAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/Voting.sol/Voting.json", "utf8")
    ).abi;

    const [names, votes] = await publicClient.readContract({
        address: votingAddress,
        abi: votingAbi,
        functionName: "getResults"
    }) as [string[], bigint[]];

    console.log("\n=== Election Results ===\n");
    names.forEach((name, i) => {
        console.log(`${name}: ${votes[i]} votes`);
    });
}

main().catch(console.error);