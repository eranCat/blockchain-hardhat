// scripts/fetchElectionStatusNode.ts
import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
async function main() {
    const rpc = process.env.VITE_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL;
    if (!rpc) throw new Error('Set VITE_SEPOLIA_RPC_URL in .env for node checks');
    const votingAddr = process.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA || process.env.VOTING_ADDR_SEPOLIA;
    if (!votingAddr) throw new Error('Set VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA or VOTING_ADDR_SEPOLIA in .env');

    const abiPath = 'frontend/src/contracts/Voting.json';
    if (!fs.existsSync(abiPath)) throw new Error('ABI missing at ' + abiPath + '. Run npx hardhat compile and copy artifacts.');
    const json = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(votingAddr, json.abi, provider);

    try {
        const [start, end] = await contract.getVotingWindow();
        const cnt = await contract.getCandidatesCount();
        const all = await contract.getAllCandidates();
        console.log('window:', start.toString(), end.toString());
        console.log('candidates count:', cnt.toString());
        console.log('first candidate name sample:', (all[0] && all[0][0]) || 'n/a');
        console.log('getAllCandidates call succeeded');
    } catch (err: any) {
        console.error('Node fetch error:', err.message || err);
        throw err;
    }
}
main().catch(e => { console.error(e); process.exit(1); });
