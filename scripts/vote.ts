import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { config } from "dotenv";

config(); // Load .env file

async function main() {
    const candidateId = process.argv[2] ? parseInt(process.argv[2]) : 0;

    // Load private key
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    if (!privateKey) throw new Error("SEPOLIA_PRIVATE_KEY not found in .env");

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("Voting from:", account.address);

    // Load proof
    const proofsPath = process.env.PROOFS_PATH || join(process.cwd(), "proofs.json");
    const proofsJson = JSON.parse(readFileSync(proofsPath, "utf-8"));

    console.log("Tree root:", proofsJson.tree[0]);

    const entry = proofsJson.values.find(
        (v: any) => v.value[0].toLowerCase() === account.address.toLowerCase()
    );

    if (!entry) {
        throw new Error(`No proof found for address ${account.address}`);
    }

    const tree = StandardMerkleTree.load(proofsJson);
    const proof = tree.getProof(entry.treeIndex) as `0x${string}`[];

    console.log("Proof:", proof);

    // Load contract ABI
    const artifactPath = join(process.cwd(), "artifacts/contracts/Voting.sol/Voting.json");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

    const votingAddress = "0x23770a5CDCefb121c37B83BAAaE96cCa5d475A72";

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL),
    });

    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL),
    });

    // Check if already voted
    const hasVoted = await publicClient.readContract({
        address: votingAddress as `0x${string}`,
        abi: artifact.abi,
        functionName: "hasVoted",
        args: [account.address],
    });

    if (hasVoted) {
        console.log("Already voted!");
        return;
    }

    // Vote
    console.log(`Voting for candidate ${candidateId}...`);
    const hash = await walletClient.writeContract({
        address: votingAddress as `0x${string}`,
        abi: artifact.abi,
        functionName: "vote",
        args: [BigInt(candidateId), proof],
    });

    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmation...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Vote confirmed! Block:", receipt.blockNumber);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error.message);
        process.exit(1);
    });