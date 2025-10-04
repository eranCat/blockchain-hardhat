import { createWalletClient, createPublicClient, http, getContract } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
    // Setup
    const rpcUrl = process.env.SEPOLIA_RPC_URL!;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY! as `0x${string}`;
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA! as `0x${string}`;

    if (!rpcUrl || !privateKey || !votingAddr) {
        throw new Error("Missing env vars: SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, VOTING_ADDR_SEPOLIA");
    }

    const account = privateKeyToAccount(privateKey);

    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl),
    });

    console.log("Setting up election on Sepolia...");
    console.log("Account:", account.address);
    console.log("Voting:", votingAddr);
    console.log();

    // Load Voting ABI
    const votingAbi = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'artifacts/contracts/Voting.sol/Voting.json'), 'utf8')
    ).abi;

    const voting = getContract({
        address: votingAddr,
        abi: votingAbi,
        client: { public: publicClient, wallet: walletClient },
    });

    // Add candidates
    const candidates = [
        { name: "Alice", positions: [3, 7, 5] },
        { name: "Bob", positions: [7, 3, 8] },
        { name: "Charlie", positions: [5, 5, 3] },
    ];

    console.log("Adding candidates...");
    for (const candidate of candidates) {
        try {
            const hash = await voting.write.setCandidate([
                candidate.name,
                candidate.positions
            ]);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✓ ${candidate.name} added (tx: ${hash.slice(0, 10)}...)`);
        } catch (err: any) {
            console.log(`⊙ ${candidate.name} (${err.message.slice(0, 50)}...)`);
        }
    }

    // Set voting window
    const now = Math.floor(Date.now() / 1000);
    const start = now + 300; // 5 minutes
    const end = start + (86400 * 3); // 3 days

    console.log("\nSetting voting window...");
    try {
        const hash = await voting.write.setVotingWindow([BigInt(start), BigInt(end)]);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("✓ Window set");
        console.log("  Starts:", new Date(start * 1000).toISOString());
        console.log("  Ends:", new Date(end * 1000).toISOString());
    } catch (err: any) {
        console.log("⊙ Window:", err.message.slice(0, 50));
    }

    // Set Merkle root
    const merkleRoot = process.env.VOTER_MERKLE_ROOT as `0x${string}`;
    if (merkleRoot) {
        console.log("\nSetting voter registry...");
        try {
            const hash = await voting.write.setVoterRoot([merkleRoot]);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("✓ Root set");
        } catch (err: any) {
            console.log("⊙ Root:", err.message.slice(0, 50));
        }
    }

    console.log("\n✓ Setup complete!");
    console.log("\nView on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${votingAddr}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});