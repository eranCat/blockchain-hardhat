import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
    console.log("Starting verification...");

    const votingAddress = "0x23770a5CDCefb121c37B83BAAaE96cCa5d475A72";
    const expectedRoot = "0x49fb3c00cc347c347ad628f43f49a583fcb706cc84fca84ea2d49a5c37ff5ab2";

    console.log("Reading artifact...");
    const artifactPath = join(process.cwd(), "artifacts/contracts/Voting.sol/Voting.json");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

    console.log("Creating client...");
    const client = createPublicClient({
        chain: sepolia,
        transport: http("https://eth-sepolia.g.alchemy.com/v2/demo", {
            timeout: 10_000,
        }),
    });

    console.log("Reading voterRoot from contract...");
    const onChainRoot = await client.readContract({
        address: votingAddress as `0x${string}`,
        abi: artifact.abi,
        functionName: "voterRoot",
    });

    console.log("\n=== Results ===");
    console.log("On-chain voter root:", onChainRoot);
    console.log("Expected root:     ", expectedRoot);
    console.log("Match:", onChainRoot.toLowerCase() === expectedRoot.toLowerCase());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error.message);
        process.exit(1);
    });