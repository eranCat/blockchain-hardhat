// scripts/deployAndStartElection.ts
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type Hex = `0x${string}`;
type StandardV1 = { format: "standard-v1"; tree: Hex[] };
type ProofMapFile = { root: Hex; proofs?: Record<string, Hex[]> };

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

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const BAL = await ethers.getContractFactory("BALToken");
    const bal = await BAL.deploy();
    await bal.waitForDeployment();

    const NFT = await ethers.getContractFactory("CandidateNFT");
    const nft = await NFT.deploy(deployer.address);
    await nft.waitForDeployment();

    const Voting = await ethers.getContractFactory("Voting");
    const reward = 10n; // BAL per vote
    const voting = await Voting.deploy(await bal.getAddress(), await nft.getAddress(), reward);
    await voting.waitForDeployment();

    // set minter if your BAL/NFT require it (call your own method as needed)
    // e.g., await bal.setMinter(await voting.getAddress());

    // candidates
    const names = ["Alice", "Bob", "Charlie"];
    const pos: [number, number, number][] = [
        [5, 6, 4],
        [8, 3, 7],
        [2, 9, 5],
    ];
    const uris = names.map((n) => `ipfs://${n.toLowerCase()}`);
    const receivers = [deployer.address, deployer.address, deployer.address];
    await (await voting.setCandidatesWithNFT(names, pos as any, uris, receivers)).wait();

    // voter root (prefer standard-v1/file if available)
    const fileRoot = tryLoadRoot();
    if (fileRoot) {
        await (await voting.setVoterRoot(fileRoot)).wait();
        console.log("✅ Merkle root set from file:", fileRoot);
    } else if (process.env.VOTER_MERKLE_ROOT) {
        const root = process.env.VOTER_MERKLE_ROOT as Hex;
        await (await voting.setVoterRoot(root)).wait();
        console.log("✅ Merkle root set from env:", root);
    } else {
        console.log("⚠️  No voter root provided (file/env).");
    }

    // 1-day window by default
    const now = Math.floor(Date.now() / 1000);
    const start = BigInt(now + 60);        // start in 1 min
    const end = start + BigInt(86400);     // +1 day
    await (await voting.startElection(start, end)).wait();

    console.log("\n--- Election summary ---");
    console.log("Contract (Voting):", await voting.getAddress());
    console.log("BAL token addr:", await bal.getAddress());
    console.log("NFT addr:", await nft.getAddress());
    console.log("Voting window (unix):", start.toString(), "->", end.toString());
    console.log("Reward per vote (BAL):", reward.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
