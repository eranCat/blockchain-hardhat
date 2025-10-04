import hre from "hardhat";

async function main() {
    // Get voting address - hardhat network (localhost)
    const votingAddr = (process.env.VOTING_ADDR_LOCAL || process.env.VITE_VOTING_CONTRACT_ADDRESS) as `0x${string}`;

    if (!votingAddr) {
        throw new Error("Voting address not found. Set VOTING_ADDR_LOCAL or VITE_VOTING_CONTRACT_ADDRESS in .env");
    }

    console.log("⚙️  Setting up election on local network...");
    console.log(`📍 Voting contract: ${votingAddr}\n`);

    const voting = await hre.viem.getContractAt("Voting", votingAddr);

    // Add candidates with policy positions
    const candidates = [
        { name: "Alice", positions: [3, 7, 5] },   // Progressive economics
        { name: "Bob", positions: [7, 3, 8] },     // Conservative social
        { name: "Charlie", positions: [5, 5, 3] }, // Moderate isolationist
    ];

    console.log("👥 Adding candidates...");
    for (const candidate of candidates) {
        try {
            const hash = await voting.write.setCandidate([
                candidate.name,
                candidate.positions as [number, number, number]
            ]);
            console.log(`✅ ${candidate.name} added (positions: [${candidate.positions.join(', ')}])`);
        } catch (err: any) {
            if (err.message.includes("revert")) {
                console.log(`⭐ ${candidate.name} (already exists)`);
            } else {
                throw err;
            }
        }
    }

    // Set voting window
    const now = Math.floor(Date.now() / 1000);
    const start = now + 60;  // Start in 1 minute
    const end = start + (86400 * 3); // 3 days

    console.log("\n⏰ Setting voting window...");
    try {
        await voting.write.setVotingWindow([BigInt(start), BigInt(end)]);
        console.log(`✅ Voting starts: ${new Date(start * 1000).toISOString()}`);
        console.log(`   Voting ends:   ${new Date(end * 1000).toISOString()}`);
    } catch (err: any) {
        console.log("⚠️  Voting window already set or error:", err.message);
    }

    // Set Merkle root (if available)
    const merkleRoot = process.env.VOTER_MERKLE_ROOT;
    if (merkleRoot) {
        console.log("\n🌳 Setting voter registry...");
        try {
            await voting.write.setVoterRoot([merkleRoot as `0x${string}`]);
            console.log("✅ Merkle root set");
        } catch (err: any) {
            console.log("⚠️  Root already set or error:", err.message);
        }
    } else {
        console.log("\n⚠️  VOTER_MERKLE_ROOT not set - add it to .env!");
        console.log("   It should be: 0x871ff315bb722c78d10f8eb075e6c52e7b99e03dd6c7b27b5b7e9296ad9cff97");
    }

    console.log("\n✅ Setup complete!\n");
}

main().catch(console.error);