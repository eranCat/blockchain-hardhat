 
import { createWalletClient, createPublicClient, http, getContract } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL!;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY! as `0x${string}`;
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA! as `0x${string}`;

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

    console.log("Voting on Sepolia");
    console.log("Voter:", account.address);

    const votingAbi = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'artifacts/contracts/Voting.sol/Voting.json'), 'utf8')
    ).abi;

    const voting = getContract({
        address: votingAddr,
        abi: votingAbi,
        client: { public: publicClient, wallet: walletClient },
    });

    const proofsPath = './data/proofs/proofs.json';
    if (!fs.existsSync(proofsPath)) {
        throw new Error("Run: npx tsx scripts/generateProofs.ts");
    }

    const tree = StandardMerkleTree.load(JSON.parse(fs.readFileSync(proofsPath, 'utf8')));

    let proof: `0x${string}`[] | null = null;
    for (const [i, v] of tree.entries()) {
        if (v[0].toLowerCase() === account.address.toLowerCase()) {
            proof = tree.getProof(i) as `0x${string}`[];
            break;
        }
    }

    if (!proof) {
        throw new Error(`Add ${account.address} to data/voters.json and regenerate proofs`);
    }

    const voteType = process.argv[2] || "direct";
    const candidateId = parseInt(process.argv[3] || "0");

    if (voteType === "q" || voteType === "questionnaire") {
        const positions = [
            parseInt(process.argv[3] || "3"),
            parseInt(process.argv[4] || "8"),
            parseInt(process.argv[5] || "5"),
        ];

        console.log(`Questionnaire vote: [${positions.join(', ')}]`);
        const hash = await voting.write.voteByQuestionnaire([positions, proof]);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("Vote cast (anonymous)");
        console.log(`https://sepolia.etherscan.io/tx/${hash}`);
    } else {
        console.log(`Direct vote for candidate ${candidateId}`);
        const hash = await voting.write.vote([BigInt(candidateId), proof]);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("Vote cast");
        console.log(`https://sepolia.etherscan.io/tx/${hash}`);
    }
}

main().catch(console.error);