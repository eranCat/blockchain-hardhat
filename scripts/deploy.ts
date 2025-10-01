import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as fs from "fs";

async function main() {
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

    console.log("Deploying BALToken...");
    const balAbi = JSON.parse(fs.readFileSync("./artifacts/contracts/BALToken.sol/BALToken.json", "utf8"));
    const balHash = await wallet.deployContract({
        abi: balAbi.abi,
        bytecode: balAbi.bytecode,
        args: ["BalToken", "BAL", account.address]
    });
    const balReceipt = await publicClient.waitForTransactionReceipt({ hash: balHash });
    const balToken = balReceipt.contractAddress!;
    console.log(`✅ ${balToken}`);

    console.log("Deploying CandidateNFT...");
    const nftAbi = JSON.parse(fs.readFileSync("./artifacts/contracts/CandidateNFT.sol/CandidateNFT.json", "utf8"));
    const nftHash = await wallet.deployContract({
        abi: nftAbi.abi,
        bytecode: nftAbi.bytecode,
        args: [account.address]
    });
    const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftHash });
    const nft = nftReceipt.contractAddress!;
    console.log(`✅ ${nft}`);

    console.log("Deploying Voting...");
    const votingAbi = JSON.parse(fs.readFileSync("./artifacts/contracts/Voting.sol/Voting.json", "utf8"));
    const votingHash = await wallet.deployContract({
        abi: votingAbi.abi,
        bytecode: votingAbi.bytecode,
        args: [balToken, 10n * 10n ** 18n, nft]
    });
    const votingReceipt = await publicClient.waitForTransactionReceipt({ hash: votingHash });
    const voting = votingReceipt.contractAddress!;
    console.log(`✅ ${voting}`);

    console.log("\nTransferring ownership...");
    const nftTransfer = await wallet.writeContract({
        address: nft,
        abi: nftAbi.abi,
        functionName: "transferOwnership",
        args: [voting]
    });
    await publicClient.waitForTransactionReceipt({ hash: nftTransfer });
    console.log("✅ NFT → Voting");

    console.log("\n=== UPDATE .env ===");
    console.log(`VOTING_ADDR_SEPOLIA=${voting}`);
    console.log(`BAL_TOKEN_ADDR_SEPOLIA=${balToken}`);
    console.log(`CANDIDATE_NFT_ADDR=${nft}`);
}

main().catch(console.error);