import hre from "hardhat";

async function main() {
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;

    if (!votingAddr) {
        throw new Error("VOTING_ADDR_SEPOLIA not found in .env");
    }

    const voting = await hre.viem.getContractAt("Voting", votingAddr);

    console.log("⚙️  Setting up election...\n");

    // Add candidates with policy positions
    const candidates = [
        { name: "Alice", positions: [3, 7, 5] },   // Progressive economics
        { name: "Bob", positions: [7, 3, 8] },     // Conservative social
        { name: "Charlie", positions: [5, 5, 3] }, // Moderate isolationist
    ];

    console.log("📝 Adding candidates...");
    for (const candidate of candidates) {
        try {
            const hash = await voting.write.setCandidate([
                candidate.name,
                candidate.positions as [number, number, number]
            ]);
            console.log(`✅ ${candidate.name} added (positions: [${candidate.positions}])`);
        } catch (err: any) {
            if (err.message.includes("revert")) {
                console.log(`⏭️  ${candidate.name} (already exists)`);
            } else {
                throw err;
            }
        }
    }

    // Set voting window (starts in 1 hour, lasts 3 days)
    const now = Math.floor(Date.now() / 1000);
    const start = now + 3600;        // +1 hour
    const end = start + (86400 * 3); // +3 days

    console.log("\n⏰ Setting voting window...");
    await voting.write.setVotingWindow([BigInt(start), BigInt(end)]);
    console.log(`✅ Voting: ${new Date(start * 1000).toISOString()}`);
    console.log(`   Until: ${new Date(end * 1000).toISOString()}`);

    // Set Merkle root (if available)
    const merkleRoot = process.env.VOTER_MERKLE_ROOT;
    if (merkleRoot) {
        console.log("\n🌳 Setting voter registry...");
        await voting.write.setVoterRoot([merkleRoot as `0x${string}`]);
        console.log("✅ Merkle root set");
    } else {
        console.log("\n⚠️  VOTER_MERKLE_ROOT not set - generate proofs first!");
    }

    console.log("\n✅ Setup complete!\n");
}

main().catch(console.error);
