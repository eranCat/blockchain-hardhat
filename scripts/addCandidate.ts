// scripts/addCandidate.ts
// Minimal, TS-friendly, no Hardhat type imports.
// Keeps your original utils.js flow, just adds network-scoped addr + better env parsing.

import { requireEnv, getVoting as getVotingContract, sendAndWait } from "./utils.js";



/** Prefer VOTING_ADDR_<NETWORK> if present, otherwise leave VOTING_ADDR as-is. */
// function resolveNetworkScopedVotingAddr() {
//     const net = (process.env.HARDHAT_NETWORK || "").toUpperCase(); // e.g. "SEPOLIA", "LOCALHOST"
//     if (!net) return;

//     const scopedKey = `VOTING_ADDR_${net}`;
//     const scoped = process.env[scopedKey];
//     if (scoped && scoped.trim()) {
//         process.env.VOTING_ADDR = scoped.trim();
//         console.log(`[env] Using ${scopedKey} -> VOTING_ADDR=${process.env.VOTING_ADDR}`);
//     } else if (process.env.VOTING_ADDR) {
//         console.log(`[env] Using VOTING_ADDR=${process.env.VOTING_ADDR}`);
//     } else {
//         console.warn(`[env] Missing VOTING_ADDR (and ${scopedKey}).`);
//     }
// }

/** Return candidate names; prefer CANDIDATE_NAMES (CSV) over CANDIDATE_NAME. */
function getCandidateNames(): string[] {
    const plural = (process.env.CANDIDATE_NAMES || "").trim();
    if (plural) {
        const list = plural
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (list.length > 0) {
            console.log(`[env] Using CANDIDATE_NAMES: [${list.join(", ")}]`);
            return list;
        }
    }

    const single = process.env.CANDIDATE_NAME ?? requireEnv("CANDIDATE_NAME");
    const one = String(single).trim();
    if (!one) throw new Error("No candidate names provided (CANDIDATE_NAME empty).");

    console.log(`[env] Using CANDIDATE_NAME: ${one}`);
    return [one];
}

async function main() {
    const arr = getCandidateNames();
    if (!arr.length) throw new Error("No candidate names provided");

    const voting = await getVotingContract();
    const { hash } = await sendAndWait(voting.write.setCandidates([arr]));
    console.log(`✅ setCandidates(${arr.length}) tx:`, hash);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
