// scripts/voteFromProof.ts
import 'dotenv/config';
import { ethers } from 'hardhat';
import fs from 'fs/promises';
import path from 'path';

async function main() {
    const votingAddr =
        process.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA ||
        process.env.VOTING_ADDR_SEPOLIA ||
        process.env.VOTE_CONTRACT_ADDR;
    if (!votingAddr) throw new Error('Set VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA or VOTING_ADDR_SEPOLIA in .env');

    const proofsPath = path.resolve(process.env.PROOFS_PATH || 'data/proofs/proofs.json');
    const proofsJson = JSON.parse(await fs.readFile(proofsPath, 'utf8'));
    const proofs = proofsJson.proofs || proofsJson.proof || proofsJson.proofs || {};
    const root = proofsJson.root || proofsJson.merkleRoot;

    if (!process.env.SEPOLIA_PRIVATE_KEY) throw new Error('Set SEPOLIA_PRIVATE_KEY env to the voter private key');

    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, ethers.provider);
    const myAddr = await wallet.getAddress();
    console.log('Signer address:', myAddr);

    const myProof = proofs[myAddr] ?? proofs[myAddr.toLowerCase()] ?? proofs[myAddr.toUpperCase()];
    if (!myProof) throw new Error('No Merkle proof for this address in ' + proofsPath);

    const voting = await ethers.getContractAt('Voting', votingAddr, wallet);
    console.log('On-chain merkle root:', await voting.getVoterMerkleRoot());
    console.log('Local merkle root:     ', root);

    const candidateId = Number(process.env.CANDIDATE_ID || 0);
    console.log('Voting for candidateId =', candidateId);
    const tx = await voting.vote(candidateId, myProof);
    console.log('Tx submitted:', tx.hash);
    await tx.wait();
    console.log('Vote mined ✅');
}

main().catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
});
