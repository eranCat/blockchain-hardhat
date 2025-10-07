// scripts/deployAndStartElection.ts
import 'dotenv/config';
import { ethers } from 'hardhat';
import { getAddress } from 'ethers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

async function writeJson(file: string, data: unknown) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function parseAddresses(src?: string) {
    if (!src) throw new Error('VOTER_ADDRESSES is required (comma/space separated addresses)');
    const list = src
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(a => getAddress(a));
    if (list.length === 0) throw new Error('VOTER_ADDRESSES is empty');
    return Array.from(new Set(list));
}

async function copyABIsToFrontend() {
    const pairs = [
        ['artifacts/contracts/Voting.sol/Voting.json', 'frontend/src/contracts/Voting.json'],
        ['artifacts/contracts/BALToken.sol/BALToken.json', 'frontend/src/contracts/BALToken.json'],
        ['artifacts/contracts/CandidateNFT.sol/CandidateNFT.json', 'frontend/src/contracts/CandidateNFT.json'],
    ];
    for (const [src, dst] of pairs) {
        const absSrc = path.resolve(src);
        const absDst = path.resolve(dst);
        await fs.mkdir(path.dirname(absDst), { recursive: true });
        // ignore errors if artifact missing
        try {
            await fs.copyFile(absSrc, absDst);
        } catch {
            // skip
        }
    }
}

async function main() {
    const voters = parseAddresses(process.env.VOTER_ADDRESSES);
    const values: [string][] = voters.map(v => [v]);
    const tree = StandardMerkleTree.of(values, ['address']);
    const root = tree.root as `0x${string}`;

    const proofs: Record<string, string[]> = {};
    for (const [i, v] of tree.entries()) {
        const addr = getAddress((v as [string])[0]);
        proofs[addr] = tree.getProof(i);
    }

    const outDir = path.resolve('data/proofs');
    await writeJson(path.join(outDir, 'tree.json'), tree.dump());
    await writeJson(path.join(outDir, 'proofs.json'), { root, proofs });

    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', await deployer.getAddress());

    // 1) Deploy or reuse BALToken
    let balAddress = process.env.VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA || process.env.BAL_TOKEN_ADDR_SEPOLIA || process.env.BAL_TOKEN_ADDR;
    const rewardPerVote = process.env.REWARD_PER_VOTE || '0';

    if (!balAddress) {
        console.log('No BAL token address provided in env — deploying BALToken with constructor args...');
        const BalFactory = await ethers.getContractFactory('BALToken');
        // README expects: BALToken("Ballot Token", "BAL", YOUR_ADDRESS)
        const bal = await BalFactory.deploy('Ballot Token', 'BAL', await deployer.getAddress());
        // ethers v6: wait for deployment
        if ((bal as any).waitForDeployment) {
            await (bal as any).waitForDeployment();
        } else if ((bal as any).deployed) {
            await (bal as any).deployed();
        }
        balAddress = await bal.getAddress();
        console.log('Deployed BALToken at:', balAddress);
    } else {
        console.log('Using BAL token from env:', balAddress);
    }

    // 2) Try deploy CandidateNFT (optional)
    let candidateNftAddress: string | undefined;
    try {
        const CFactory = await ethers.getContractFactory('CandidateNFT');
        const cand = await CFactory.deploy();
        if ((cand as any).waitForDeployment) {
            await (cand as any).waitForDeployment();
        } else if ((cand as any).deployed) {
            await (cand as any).deployed();
        }
        candidateNftAddress = await cand.getAddress();
        console.log('Deployed CandidateNFT at:', candidateNftAddress);
    } catch {
        console.log('CandidateNFT not found or skipped.');
    }

    // 3) Deploy Voting with correct args (balAddress, rewardPerVote)
    console.log('Deploying Voting with args: (balAddress, rewardPerVote)');
    const VotingFactory = await ethers.getContractFactory('Voting');
    const voting = await VotingFactory.deploy(balAddress, rewardPerVote);
    if ((voting as any).waitForDeployment) {
        await (voting as any).waitForDeployment();
    } else if ((voting as any).deployed) {
        await (voting as any).deployed();
    }
    const votingAddr = await voting.getAddress();
    console.log('Voting deployed to:', votingAddr);

    // 4) Start election (start, end, names, positions, root)
    const now = Math.floor(Date.now() / 1000);
    const start = Number(process.env.ELECTION_START_TS || now + Number(process.env.ELECTION_START_OFFSET_SEC || 60));
    const end = Number(process.env.ELECTION_END_TS || start + Number(process.env.ELECTION_DURATION_SEC || 3600)); // default 1 hour
    const names = (process.env.CANDIDATE_NAMES?.split(',').map(s => s.trim()).filter(Boolean)) ?? ['Alice', 'Bob', 'Charlie'];
    const positions: [number, number, number][] = process.env.CANDIDATE_POSITIONS_JSON
        ? (JSON.parse(process.env.CANDIDATE_POSITIONS_JSON) as [number, number, number][])
        : [
            [4, 6, 5],
            [6, 4, 5],
            [5, 5, 6],
        ];

    console.log('Starting election:', { start, end, names, root });
    const tx = await voting.startNewElection(start, end, names, positions, root);
    await tx.wait();
    console.log('Election started.');

    // 5) Print env lines and copy ABIs
    console.log('\n=== Add to .env ===');
    console.log(`VOTING_ADDR_SEPOLIA=${votingAddr}`);
    console.log(`VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=${votingAddr}`);
    console.log(`VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA=${balAddress}`);
    if (candidateNftAddress) console.log(`VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=${candidateNftAddress}`);
    console.log(`VOTER_MERKLE_ROOT=${root}`);
    console.log(`REWARD_PER_VOTE=${rewardPerVote}`);
    console.log('===================');

    await copyABIsToFrontend();
    console.log('ABIs copied (if artifacts existed).');

    console.log('\nProofs written to:', path.join(outDir, 'proofs.json'));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Script failed:', err);
        process.exit(1);
    });
