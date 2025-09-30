// scripts/checkResults.ts
import { getVotingContract, getPublicClient } from "./utils.js";

async function main() {
    const voting = await getVotingContract();
    const publicClient = await getPublicClient();

    console.log("\n📊 Voting Results:\n");

    try {
        // Get candidates
        const candidates = await voting.read.getCandidates();

        // Get current block to limit event search
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = process.env.DEPLOYMENT_BLOCK
            ? BigInt(process.env.DEPLOYMENT_BLOCK)
            : currentBlock - 1000n;

        // Get Voted events with limited block range
        const votedEvents = await publicClient.getContractEvents({
            address: voting.address,
            abi: voting.abi,
            eventName: 'Voted',
            fromBlock: fromBlock,
            toBlock: currentBlock,
        });

        // Count votes per candidate
        const voteCounts: Record<number, number> = {};
        for (let i = 0; i < candidates.length; i++) {
            voteCounts[i] = 0;
        }

        for (const event of votedEvents) {
            const candidateId = Number(event.args.candidateId);
            voteCounts[candidateId]++;
        }

        // Create results array and sort by votes
        const results = candidates.map((name, id) => ({
            id,
            name,
            votes: voteCounts[id]
        })).sort((a, b) => b.votes - a.votes);

        // Display results with medals
        results.forEach((candidate, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
            console.log(`${medal} ${candidate.name}: ${candidate.votes} vote(s)`);
        });

        console.log(`\n   Total votes cast: ${votedEvents.length}\n`);

    } catch (error: any) {
        console.error("Error:", error.message);

        if (error.message.includes("status code") || error.message.includes("rate limit")) {
            console.log("\n💡 Tip: Alchemy rate limit hit. Try:");
            console.log("   - Use a smaller block range");
            console.log("   - Upgrade your Alchemy plan");
            console.log("   - Switch to a different RPC provider");
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});