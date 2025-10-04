import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config();

async function main() {
    // For single address, root = keccak256(abi.encodePacked(address))
    const newRoot = "0x07b8dcf923b686204bae0a5609ea35fffe62ddf3abe320fde1c5a9ebc3e2d336";

    console.log("Setting root for single address");

    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    if (!privateKey) throw new Error("SEPOLIA_PRIVATE_KEY not found");

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("Updating from:", account.address);

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

    console.log("Setting new voter root:", newRoot);
    const hash = await walletClient.writeContract({
        address: votingAddress as `0x${string}`,
        abi: artifact.abi,
        functionName: "setVoterRoot",
        args: [newRoot],
    });

    console.log("Transaction hash:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Voter root updated! Block:", receipt.blockNumber);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error.message);
        process.exit(1);
    });