// scripts/checkState.ts
import 'dotenv/config';
import { ethers } from 'hardhat';
import fs from 'fs/promises';
import path from 'path';

function toISO(ts: number | string) {
    const n = Number(ts);
    if (Number.isNaN(n) || n <= 0) return 'n/a';
    return new Date(n * 1000).toISOString();
}

async function fileExists(p: string) {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

// Convert BigInt / BigNumber / arrays / nested objects into serializable values
function toSafe(x: any): any {
    if (x === null || x === undefined) return x;
    if (Array.isArray(x)) return x.map(toSafe);
    if (typeof x === 'bigint') return x.toString();
    // ethers v5 BigNumber has toString(); ethers v6 may return native bigint
    if (typeof x === 'object') {
        // handle BigNumber-like or objects that implement toString
        try {
            if (typeof x.toString === 'function' && !Array.isArray(x)) {
                const s = x.toString();
                // toString for objects like bytes will produce something useful; for BigNumber -> decimal
                // If toString returns "[object Object]" fall through to map keys
                if (s !== '[object Object]') return s;
            }
        } catch {
            // ignore and try deep mapping
        }
        // deep-map object keys (fallback)
        const out: any = {};
        for (const k of Object.keys(x)) {
            out[k] = toSafe(x[k]);
        }
        return out;
    }
    return x;
}

async function main() {
    const votingAddr =
        process.env.VOTING_ADDR_SEPOLIA ||
        process.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA ||
        process.env.VOTE_CONTRACT_ADDR;

    if (!votingAddr) throw new Error('Set VOTING_ADDR_SEPOLIA or VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA or VOTE_CONTRACT_ADDR in env');

    const provider = ethers.provider;
    let caller: any = (await ethers.getSigners())[0];

    if (process.env.PRIVATE_KEY) {
        const Wallet = (ethers as any).Wallet ?? (await import('ethers')).Wallet;
        caller = new Wallet(process.env.PRIVATE_KEY, provider);
    }

    console.log('Using caller address:', await caller.getAddress());
    const voting = await ethers.getContractAt('Voting', votingAddr, caller);

    // Fetch general election state
    const [start, end] = await voting.getVotingWindow();
    const session = await voting.votingSession();
    const merkleRoot = await voting.getVoterMerkleRoot();
    const rewardPerVote = await (async () => {
        try {
            return await voting.rewardPerVote();
        } catch {
            try { return await voting.reward(); } catch { return ethers.constants.Zero; }
        }
    })();

    let balAddress = 'n/a';
    try {
        balAddress = (await (voting as any).balToken()).toString();
    } catch { /* ignore */ }

    console.log('--- Election summary ---');
    console.log('Contract:', votingAddr);
    console.log('BAL token addr:', balAddress);
    console.log('Voting session id:', session.toString());
    console.log('Voting window (unix):', start.toString(), '->', end.toString());
    console.log('Voting window (UTC):', toISO(start.toString()), '->', toISO(end.toString()));
    console.log('Merkle root (on-chain):', merkleRoot);
    console.log('Reward per vote:', toSafe(rewardPerVote));
    console.log('');

    // Candidates
    const countBN = await voting.candidateCountView();
    const count = Number(countBN.toString());
    console.log(`Candidates count: ${count}`);
    if (count === 0) {
        console.log('(no candidates configured)');
    } else {
        for (let i = 0; i < count; i++) {
            try {
                const c = await voting.getCandidate(i);
                // c expected: (name, positions, votes, exists)
                const name = toSafe(c[0]);
                const positions = toSafe(c[1]);
                const votes = toSafe(c[2]);
                const exists = toSafe(c[3]);
                console.log(`#${i} ${name} | votes=${votes} | exists=${exists} | positions=${JSON.stringify(positions)}`);
            } catch (err) {
                console.log(`#${i} - failed to read candidate:`, (err as any).message || err);
            }
        }
    }

    // Optional: inspect one address
    let addrToCheck = process.env.ADDRESS_TO_CHECK;
    if (!addrToCheck && process.env.PRIVATE_KEY) {
        addrToCheck = await caller.getAddress();
    }

    if (addrToCheck) {
        console.log('\n--- Address inspection ---');
        console.log('Address:', addrToCheck);

        let lastSession = 'n/a';
        try {
            const val = await voting.lastVotedSession(addrToCheck);
            lastSession = toSafe(val);
        } catch {
            try {
                const has = await voting.hasVoted(addrToCheck);
                lastSession = has ? `voted (unknown session)` : `not voted`;
            } catch {
                lastSession = 'unknown (no getter)';
            }
        }

        let votedThisSession = 'unknown';
        try {
            const ls = await voting.lastVotedSession(addrToCheck);
            const sess = await voting.votingSession();
            votedThisSession = ls.toString() === sess.toString() ? 'YES' : 'NO';
        } catch {
            try {
                const has = await voting.hasVoted(addrToCheck);
                votedThisSession = has ? 'YES' : 'NO';
            } catch {
                votedThisSession = 'unknown';
            }
        }

        console.log('lastVotedSession:', lastSession);
        console.log('votedThisSession:', votedThisSession);

        const proofsPath = process.env.PROOFS_PATH || path.resolve('data/proofs/proofs.json');
        if (await fileExists(proofsPath)) {
            try {
                const j = JSON.parse(await fs.readFile(proofsPath, 'utf8'));
                const proofs = j.proofs || j.Proofs || j.proof || {};
                const rootLocal = j.root || j.Root || j.merkleRoot;
                const proofForAddr =
                    proofs[addrToCheck] ??
                    proofs[(addrToCheck as string).toLowerCase()] ??
                    proofs[(addrToCheck as string).toUpperCase()];
                console.log('Local proofs file found:', proofsPath);
                if (rootLocal) console.log('Local merkle root:', rootLocal);
                if (proofForAddr) {
                    console.log('Found proof for address, length =', proofForAddr.length);
                } else {
                    console.log('No proof for this address in local proofs file.');
                }
            } catch (err) {
                console.log('Failed to read/parse proofs file:', (err as any).message || err);
            }
        } else {
            console.log('No local proofs file at', proofsPath);
        }
    } else {
        console.log('\n(No ADDRESS_TO_CHECK or PRIVATE_KEY provided — skipping per-address checks)');
    }

    console.log('\nDone.');
}

main().catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
});
