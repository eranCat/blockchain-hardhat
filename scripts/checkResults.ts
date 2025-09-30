// scripts/checkResults.ts
import { getVotingContract, getPublicClient } from "./utils.js";

async function main() {
    const voting = await getVotingContract();
    const publicClient = await getPublicClient();

    // Get candidates
    const candidates = await voting.read.getCandidates();
    console.log("\n📊 Voting Results:\n");

    // Get all Voted events from contract deployment
    const votedEvents = await publicClient.getContractEvents({
        address: voting.address,
        abi: voting.abi,
        eventName: 'Voted',
        fromBlock: 0n,
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

    // Display results
    for (let i = 0; i < candidates.length; i++) {
        console.log(`   ${i}. ${candidates[i]}: ${voteCounts[i]} vote(s)`);
    }

    console.log(`\n   Total votes cast: ${votedEvents.length}\n`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});