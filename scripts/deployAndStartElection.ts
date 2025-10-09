// scripts/deployAndStartElection.ts
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type Hex = `0x${string}`;

function tryLoadRoot(): Hex | null {
    const p = path.resolve("data", "proofs", "proofs.json");
    if (!fs.existsSync(p)) return null;
    const obj = JSON.parse(fs.readFileSync(p, "utf8")) as any;
    if (obj?.format === "standard-v1" && Array.isArray(obj.tree) && obj.tree[0]) {
        return obj.tree[0] as Hex;
    }
    if (typeof obj?.root === "string" && obj.root.startsWith("0x")) {
        return obj.root as Hex;
    }
    return null;
}

async function copyABIs(): Promise<void> {
    const CONTRACTS = ["Voting", "BALToken", "CandidateNFT"];
    const OUT_DIR = path.resolve("frontend", "src", "contracts");

    console.log("\n📄 Copying ABIs to frontend...");

    for (const contract of CONTRACTS) {
        const artifactPath = path.resolve("artifacts", "contracts", `${contract}.sol`, `${contract}.json`);

        if (!fs.existsSync(artifactPath)) {
            console.log(`⚠️  Artifact not found: ${contract}.json`);
            continue;
        }

        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        if (!artifact?.abi) {
            console.log(`⚠️  Missing ABI in ${contract}.json`);
            continue;
        }

        fs.mkdirSync(OUT_DIR, { recursive: true });
        const dest = path.join(OUT_DIR, `${contract}.abi.json`);
        fs.writeFileSync(dest, JSON.stringify(artifact.abi, null, 2));
        console.log(`✅ Copied ${contract}.abi.json`);
    }

    console.log("✅ All ABIs copied to frontend/src/contracts/");
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy BALToken
    console.log("\n📦 Deploying BALToken...");
    const BAL = await ethers.getContractFactory("BALToken");
    const bal = await BAL.deploy("BAL Token", "BAL", deployer.address);
    await bal.waitForDeployment();
    const balAddr = await bal.getAddress();
    console.log("✅ BALToken deployed to:", balAddr);

    // Deploy CandidateNFT
    console.log("\n📦 Deploying CandidateNFT...");
    const NFT = await ethers.getContractFactory("CandidateNFT");
    const nft = await NFT.deploy(deployer.address);
    await nft.waitForDeployment();
    const nftAddr = await nft.getAddress();
    console.log("✅ CandidateNFT deployed to:", nftAddr);

    // Deploy Voting
    console.log("\n📦 Deploying Voting contract...");
    const Voting = await ethers.getContractFactory("Voting");
    const rewardPerVote = ethers.parseEther("10"); // 10 BAL per vote
    const voting = await Voting.deploy(balAddr, nftAddr, rewardPerVote);
    await voting.waitForDeployment();
    const votingAddr = await voting.getAddress();
    console.log("✅ Voting contract deployed to:", votingAddr);

    // Grant MINTER_ROLE to Voting contract
    console.log("\n🔑 Granting MINTER_ROLE to Voting contract...");
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await (await bal.grantRole(MINTER_ROLE, votingAddr)).wait();
    await (await nft.grantRole(MINTER_ROLE, votingAddr)).wait();
    console.log("✅ Roles granted");

    // Set up candidates with positions
    console.log("\n👥 Setting up candidates...");

    // Define candidates with realistic political positions
    // Scale: 0-10 for each dimension
    // [Economic, Social, Foreign]
    const candidates = [
        {
            name: "Progressive Candidate",
            positions: [3, 8, 4] as [number, number, number],
            description: "Strong government regulation, progressive social policies, diplomatic approach",
            uri: "ipfs://QmProgressiveCandidate123"
        },
        {
            name: "Conservative Candidate",
            positions: [8, 2, 7] as [number, number, number],
            description: "Free market economy, traditional values, strong defense",
            uri: "ipfs://QmConservativeCandidate456"
        },
        {
            name: "Libertarian Candidate",
            positions: [9, 6, 2] as [number, number, number],
            description: "Maximum economic freedom, social liberty, non-interventionist",
            uri: "ipfs://QmLibertarianCandidate789"
        },
        {
            name: "Centrist Candidate",
            positions: [5, 5, 5] as [number, number, number],
            description: "Balanced approach on all policies, pragmatic solutions",
            uri: "ipfs://QmCentristCandidate321"
        },
        {
            name: "Green Candidate",
            positions: [2, 7, 3] as [number, number, number],
            description: "Environmental regulation, social justice, peace-focused",
            uri: "ipfs://QmGreenCandidate654"
        }
    ];

    console.log("\n📋 Candidate Profiles:");
    console.log("━".repeat(70));
    candidates.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name}`);
        console.log(`   Economic: ${c.positions[0]}/10 | Social: ${c.positions[1]}/10 | Foreign: ${c.positions[2]}/10`);
        console.log(`   ${c.description}`);
        console.log();
    });

    const names = candidates.map(c => c.name);
    const positions = candidates.map(c => c.positions);
    const uris = candidates.map(c => c.uri);
    const receivers = Array(candidates.length).fill(deployer.address);

    await (await voting.setCandidatesWithNFT(names, positions, uris, receivers)).wait();
    console.log("✅ Candidates set successfully!");

    console.log("\n💡 Voter Match Examples:");
    console.log("━".repeat(70));
    console.log("Use these position combinations to match with each candidate:");
    console.log();
    console.log("1. Match Progressive Candidate [3, 8, 4]:");
    console.log("   Try: [2, 8, 3] or [4, 9, 4] (Economic liberal, Social progressive, Diplomatic)");
    console.log();
    console.log("2. Match Conservative Candidate [8, 2, 7]:");
    console.log("   Try: [9, 1, 8] or [7, 3, 6] (Free market, Traditional, Strong defense)");
    console.log();
    console.log("3. Match Libertarian Candidate [9, 6, 2]:");
    console.log("   Try: [10, 7, 1] or [8, 5, 3] (Maximum freedom, Social liberty, Non-intervention)");
    console.log();
    console.log("4. Match Centrist Candidate [5, 5, 5]:");
    console.log("   Try: [5, 5, 5] or [4, 6, 5] (Moderate on everything)");
    console.log();
    console.log("5. Match Green Candidate [2, 7, 3]:");
    console.log("   Try: [1, 8, 2] or [3, 6, 4] (Environmental focus, Social justice, Peace)");
    console.log();

    // Set voter Merkle root
    console.log("\n🌳 Setting Merkle root...");
    const fileRoot = tryLoadRoot();
    if (fileRoot) {
        await (await voting.setVoterRoot(fileRoot)).wait();
        console.log("✅ Merkle root set from file:", fileRoot);
    } else if (process.env.VOTER_MERKLE_ROOT) {
        const root = process.env.VOTER_MERKLE_ROOT as Hex;
        await (await voting.setVoterRoot(root)).wait();
        console.log("✅ Merkle root set from env:", root);
    } else {
        console.log("⚠️  No voter root provided. Run: npm run merkle");
    }

    // Start election
    console.log("\n🗳️  Starting election...");
    const now = Math.floor(Date.now() / 1000);
    const start = BigInt(now + 60);        // start in 1 minute
    const end = start + BigInt(86400 * 7); // +7 days
    await (await voting.startElection(start, end)).wait();

    const startDate = new Date(Number(start) * 1000).toISOString();
    const endDate = new Date(Number(end) * 1000).toISOString();
    console.log("✅ Election started");
    console.log("   Start:", startDate);
    console.log("   End:", endDate);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("\n📍 Contract Addresses:");
    console.log("   BALToken:", balAddr);
    console.log("   CandidateNFT:", nftAddr);
    console.log("   Voting:", votingAddr);

    console.log("\n⚙️  Configuration:");
    console.log("   Reward per vote:", ethers.formatEther(rewardPerVote), "BAL");
    console.log("   Current Election ID:", await voting.currentElectionId());

    console.log("\n📝 Add to your .env file:");
    console.log("---");
    console.log(`BAL_TOKEN_ADDR_SEPOLIA=${balAddr}`);
    console.log(`CANDIDATE_NFT_ADDR=${nftAddr}`);
    console.log(`VOTING_ADDR_SEPOLIA=${votingAddr}`);
    console.log(`VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=${votingAddr}`);
    console.log(`VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA=${balAddr}`);
    console.log(`VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=${nftAddr}`);

    console.log("\n🎯 Next Steps:");
    console.log("1. Update .env files (backend and frontend)");
    console.log("2. Copy proofs.json to frontend/public/data/proofs/");
    console.log("3. Run: npm run extract-abi (to update frontend ABIs)");
    console.log("4. Start frontend and test voting!");
    console.log();
    console.log("📝 Test the questionnaire with different positions:");
    console.log("   - Progressive: [2-4, 7-9, 3-5]");
    console.log("   - Conservative: [7-9, 1-3, 6-8]");
    console.log("   - Libertarian: [8-10, 5-7, 1-3]");
    console.log("   - Centrist: [4-6, 4-6, 4-6]");
    console.log("   - Green: [1-3, 6-8, 2-4]");
    console.log("=".repeat(60) + "\n");
}

main().catch((e) => {
    console.error("\n❌ Deployment failed:");
    console.error(e);
    process.exit(1);
});