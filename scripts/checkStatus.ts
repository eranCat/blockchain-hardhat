import hre from "hardhat";

async function main() {
    const votingAddr = process.env.VOTING_ADDR_SEPOLIA as `0x${string}`;
    const voting = await hre.viem.getContractAt("Voting", votingAddr);

    console.log("\n📊 Election Status\n");
    console.log("=".repeat(50));

    // Check voting window
    const [start, end] = await voting.read.getVotingWindow();
    const now = BigInt(Math.floor(Date.now() / 1000));

    console.log("\n⏰ Voting Period:");
    console.log(`   Start: ${new Date(Number(start) * 1000).toISOString()}`);
    console.log(`   End:   ${new Date(Number(end) * 1000).toISOString()}`);

    let status = "⏳ Not Started";
    if (now >= start && now <= end) {
        status = "✅ Active";
    } else if (now > end) {
        status = "🔒 Ended";
    }
    console.log(`   Status: ${status}`);

    // Check candidates
    const count = await voting.read.candidateCount();
    console.log(`\n👥 Candidates: ${count}`);

    if (count > 0n) {
        const candidates = await voting.read.getAllCandidates();

        for (let i = 0; i < candidates[0].length; i++) {
            console.log(`\n   [${i}] ${candidates[0][i]}`);
            console.log(`       Positions: [${candidates[1][i].join(", ")}]`);
            console.log(`       Votes: ${candidates[2][i]}`);
        }
    }

    // Check results (if voting ended)
    if (now > end && count > 0n) {
        console.log("\n🏆 Results:");
        const results = await voting.read.getResults();

        for (let i = 0; i < results[0].length; i++) {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
            console.log(`${medal} ${results[0][i]}: ${results[1][i]} votes`);
        }

        const winner = await voting.read.getWinner();
        console.log(`\n👑 Winner: ${winner}`);
    }

    console.log("\n" + "=".repeat(50) + "\n");
}

main().catch(console.error);