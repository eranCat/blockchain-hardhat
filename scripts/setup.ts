import hre from "hardhat";

async function main() {
    // Select address based on network
    const votingAddr = hre.network.name === "sepolia"
        ? process.env.VOTING_ADDR_SEPOLIA
        : process.env.VOTING_ADDR_LOCAL;

    if (!votingAddr) {
        throw new Error(`VOTING_ADDR_${hre.network.name.toUpperCase()} not set in .env`);
    }

    console.log("⚙️  Setting up election...");
    console.log(`📍 Network: ${hre.network.name}`);
    console.log(`📍 Voting contract: ${votingAddr}\n`);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = Voting.attach(votingAddr);

    // Add candidates with policy positions
    const candidates = [
        { name: "Alice", positions: [3, 7, 5] as [number, number, number] },
        { name: "Bob", positions: [7, 3, 8] as [number, number, number] },
        { name: "Charlie", positions: [5, 5, 3] as [number, number, number] },
    ];

    console.log("👥 Adding candidates...");

    // First, use setCandidates to add all candidates with default positions
    const names = candidates.map(c => c.name);
    try {
        const tx = await voting.setCandidates(names);
        await tx.wait();
        console.log(`✅ Added ${names.length} candidates: ${names.join(', ')}`);
    } catch (err: any) {
        console.log(`⚠️  Error adding candidates: ${err.message.split('\n')[0]}`);
    }

    // Then update each candidate's positions individually
    console.log("\n📊 Setting custom positions...");
    for (let i = 0; i < candidates.length; i++) {
        try {
            const tx = await voting.setCandidate(candidates[i].name, candidates[i].positions);
            await tx.wait();
            console.log(`✅ ${candidates[i].name}: [${candidates[i].positions.join(', ')}]`);
        } catch (err: any) {
            console.log(`⚠️  ${candidates[i].name}: ${err.message.split('\n')[0]}`);
        }
    }

    // Check if voting window needs setup
    const [start, end] = await voting.getVotingWindow();
    if (start === 0n) {
        console.log("\n⏰ Setting voting window...");
        const now = Math.floor(Date.now() / 1000);
        const startTime = now;
        const endTime = now + (30 * 24 * 60 * 60);

        const tx = await voting.setVotingWindow(startTime, endTime);
        await tx.wait();
        console.log(`✅ Start: ${new Date(startTime * 1000).toLocaleString()}`);
        console.log(`   End: ${new Date(endTime * 1000).toLocaleString()}`);
    } else {
        console.log(`\n⏰ Voting window already set`);
        console.log(`   Start: ${new Date(Number(start) * 1000).toLocaleString()}`);
        console.log(`   End: ${new Date(Number(end) * 1000).toLocaleString()}`);
    }

    // Set Merkle root
    const merkleRoot = process.env.VOTER_MERKLE_ROOT;
    const currentRoot = await voting.voterRoot();

    if (currentRoot === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        if (merkleRoot && merkleRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("\n🌳 Setting voter registry...");
            const tx = await voting.setVoterRoot(merkleRoot);
            await tx.wait();
            console.log("✅ Merkle root set");
        } else {
            console.log("\n⚠️  VOTER_MERKLE_ROOT not set in .env");
            console.log("   Add: VOTER_MERKLE_ROOT=0x871ff315bb722c78d10f8eb075e6c52e7b99e03dd6c7b27b5b7e9296ad9cff97");
        }
    } else {
        console.log("\n🌳 Merkle root already set:", currentRoot);
    }

    // Show current state
    const count = await voting.candidateCount();
    console.log(`\n📊 Total candidates: ${count.toString()}`);

    console.log("\n✅ Setup complete!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });