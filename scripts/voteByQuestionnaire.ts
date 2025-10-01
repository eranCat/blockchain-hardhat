import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as fs from "fs";

async function main() {
    const votingAddress = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;
    if (!votingAddress) throw new Error("VOTING_ADDR_SEPOLIA not set");

    const account = privateKeyToAccount(process.env.SEPOLIA_PRIVATE_KEY as `0x${string}`);

    const wallet = createWalletClient({
        account,
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL)
    });

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL)
    });

    const votingAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/Voting.sol/Voting.json", "utf8")
    ).abi;

    const proofsPath = process.env.PROOFS_PATH || "./data/proofs/proofs.json";
    const proofsData = JSON.parse(fs.readFileSync(proofsPath, "utf8"));
    const proof = proofsData[account.address.toLowerCase()];
    if (!proof) throw new Error("No proof found");

    const result = await publicClient.readContract({
        address: votingAddress,
        abi: votingAbi,
        functionName: "getCandidateDetails",
        args: []
    });

    const [names, positions] = result as [string[], number[][]];

    console.log("\nCandidates:");
    names.forEach((n: string, i: number) => {
        console.log(`${i}. ${n} [${positions[i].join(", ")}]`);
    });

    const voterPositions = [7, 4, 5];
    console.log(`\nYour positions: [${voterPositions.join(", ")}]`);

    const hash = await wallet.writeContract({
        address: votingAddress,
        abi: votingAbi,
        functionName: "voteByQuestionnaire",
        args: [voterPositions, proof]
    });

    console.log(`\n✅ Vote cast: ${hash}`);
    console.log("Check results with: npx hardhat run scripts/checkResults.ts --network sepolia");
}

main().catch(console.error);