// scripts/deployAndStartElection.ts
import { ethers } from "hardhat";
import { copyABIs } from "./extractABI";

type Pos3 = [number, number, number];

const oneToken = (n: number | string) => ethers.parseUnits(n.toString(), 18);

// ---------- ENV parsing ----------
function parseNames(): string[] {
    const raw = process.env.CANDIDATE_NAMES?.trim();
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : ["Alice", "Bob", "Charlie"];
}
function parseUris(): string[] {
    const raw = process.env.CANDIDATE_URIS?.trim();
    return raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : ["ipfs://QmAlice.json", "ipfs://QmBob.json", "ipfs://QmCharlie.json"];
}
function parsePos(): Pos3[] {
    const raw = process.env.CANDIDATE_POS?.trim();
    if (!raw) return [[3, 7, 5], [7, 3, 8], [5, 5, 3]];
    return raw.split(";").map((chunk) => {
        const p = chunk.split("|").map((n) => Number(n.trim()));
        if (p.length !== 3) throw new Error(`Bad CANDIDATE_POS chunk: "${chunk}"`);
        p.forEach((x) => {
            if (!Number.isInteger(x) || x < 0 || x > 10) throw new Error(`positions must be 0..10, got ${x}`);
        });
        return [p[0], p[1], p[2]] as Pos3;
    });
}
function parseReceivers(fallback: string): string[] {
    const raw = process.env.CANDIDATE_RECEIVERS?.trim();
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deployer:", deployer.address);

        // 1) Deploy BALToken
        const BAL = await ethers.getContractFactory("BALToken");
        const bal = await BAL.deploy("Ballot Token", "BAL", deployer.address);
        await bal.waitForDeployment();

        // 2) Deploy CandidateNFT (creator = deployer)
        const CNFT = await ethers.getContractFactory("CandidateNFT");
        const cnft = await CNFT.deploy(deployer.address);
        await cnft.waitForDeployment();

        // 3) Deploy Voting
        const rewardWhole = process.env.REWARD_PER_VOTE ?? "10";
        const rewardPerVote = oneToken(rewardWhole);
        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy(await bal.getAddress(), await cnft.getAddress(), rewardPerVote);
        await voting.waitForDeployment();

        // 4) Grant MINTER_ROLEs
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        await (await bal.grantRole(MINTER_ROLE, await voting.getAddress())).wait();
        await (await cnft.grantRole(MINTER_ROLE, await voting.getAddress())).wait();

        // 5) Set candidates + mint NFTs
        const names = parseNames();
        const uris = parseUris();
        const pos = parsePos();
        if (!(names.length === uris.length && names.length === pos.length)) {
            throw new Error("names/uris/pos length mismatch");
        }
        const receivers = parseReceivers(deployer.address);
        const recs = names.map((_, i) => receivers[i] ?? deployer.address);

        await (
            await voting.setCandidatesWithNFT(
                names,
                pos as unknown as [number, number, number][],
                uris,
                recs
            )
        ).wait();
        console.log(`✅ Candidates set & NFTs minted: ${names.join(", ")}`);

        // 6) Start election
        const startOffset = Number(process.env.ELECTION_START_OFFSET_SEC ?? 60);
        const duration = Number(process.env.ELECTION_DURATION_SEC ?? 86400); // 1 day
        if (!Number.isFinite(startOffset) || !Number.isFinite(duration) || startOffset < 0 || duration <= 0) {
            throw new Error("Bad election timing envs");
        }
        const now = Math.floor(Date.now() / 1000);
        const startTs = now + startOffset;
        const endTs = startTs + duration;
        await (await voting.startElection(startTs, endTs)).wait();

        // 7) Optional: set Merkle root
        const root = process.env.VOTER_MERKLE_ROOT;
        if (root && /^0x[0-9a-fA-F]{64}$/.test(root)) {
            await (await voting.setVoterRoot(root as `0x${string}`)).wait();
            console.log("✅ Merkle root set:", root);
        } else {
            console.log("ℹ️  VOTER_MERKLE_ROOT not provided or invalid; voters not eligible yet.");
        }

        // 8) Copy ABIs (TS-only)
        await copyABIs();
        console.log("✅ ABIs copied.");

        // 9) Summary + ENVs
        const balAddr = await bal.getAddress();
        const cnftAddr = await cnft.getAddress();
        const voteAddr = await voting.getAddress();

        console.log("\n--- Election summary ---");
        console.log("Contract (Voting):", voteAddr);
        console.log("BAL token addr:", balAddr);
        console.log("NFT addr:", cnftAddr);
        console.log("Voting window (unix):", startTs, "->", endTs);
        console.log(
            "Voting window (UTC):",
            new Date(startTs * 1000).toISOString(),
            "->",
            new Date(endTs * 1000).toISOString()
        );
        console.log("Reward per vote (BAL):", rewardWhole);

        console.log("\n--- .env lines to copy ---");
        console.log("VOTER_MERKLE_ROOT=", root ?? "(generate & fill)");
        console.log("VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA=", balAddr);
        console.log("VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=", cnftAddr);
        console.log("VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=", voteAddr);
    } catch (err) {
        console.error("❌ Deployment failed:", (err as Error).message);
        console.error(err);
        process.exit(1);
    }
}

main();
