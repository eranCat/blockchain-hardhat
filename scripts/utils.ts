// scripts/utils.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { network } from "hardhat";
import type { Address, Hash } from "viem";

/** Require an env var or throw (deterministic scripts). */
export function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

/** Parse ISO datetime -> UNIX seconds (bigint). */
export function parseIsoToUnix(iso: string): bigint {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) throw new Error(`Bad ISO datetime: ${iso}`);
    return BigInt(Math.floor(ms / 1000));
}

/** Lowercase key lookup for proofs.json */
export function loadProofFor(address: string, file = requireEnv("PROOFS_PATH")): `0x${string}`[] {
    const p = JSON.parse(readFileSync(path.resolve(file), "utf8"));
    const key = address.toLowerCase();
    const proof = p[key] || p[address] || p[address?.toLowerCase?.()];
    if (!proof) throw new Error(`No proof found for ${address} in ${file}`);
    if (!Array.isArray(proof)) throw new Error(`Proof for ${address} is not an array`);
    if (!proof.every((h: unknown) => typeof h === "string" && (h as string).startsWith("0x")))
        throw new Error(`Invalid proof entries for ${address}`);
    return proof as `0x${string}`[];
}

/** viem helpers from the current Hardhat connection */
export async function getPublicClient() {
    const { viem } = await network.connect();
    return viem.getPublicClient();
}
export async function getWalletClients() {
    const { viem } = await network.connect();
    return viem.getWalletClients();
}
export async function getWalletClient(index = 0) {
    const wallets = await getWalletClients();
    if (!wallets.length) throw new Error("No wallet clients available");
    if (index < 0 || index >= wallets.length) throw new Error(`Wallet index ${index} out of range`);
    return wallets[index];
}

/** Wait for a tx receipt by hash. */
export async function waitForReceipt(hash: Hash) {
    const pc = await getPublicClient();
    return pc.waitForTransactionReceipt({ hash });
}

/** Typed contract getters (via hardhat-viem) */
export async function getVotingContract() {
    // Resolve network-specific address
    const networkArg = process.argv.find((arg, i) =>
        process.argv[i - 1] === "--network"
    )?.toUpperCase();

    const scopedKey = networkArg ? `VOTING_ADDR_${networkArg}` : "";
    const addr = (
        (scopedKey && process.env[scopedKey]) ||
        process.env.VOTING_ADDR ||
        ""
    ).trim();

    if (!addr) {
        throw new Error(`Missing env: ${scopedKey || "VOTING_ADDR"}`);
    }

    console.log(`[env] Network=${networkArg || "(default)"} using address=${addr}`);

    const { viem } = await network.connect();
    return viem.getContractAt("Voting", addr as Address);
}

export async function getCandidateNftContract() {
    const addr = requireEnv("CANDIDATE_NFT_ADDR") as Address;
    const { viem } = await network.connect();
    return viem.getContractAt("CandidateNFT", addr);
}

/** Send a write and wait for one confirmation. */
export async function sendAndWait(writeCall: Promise<Hash>) {
    const hash = await writeCall;
    const receipt = await waitForReceipt(hash);
    return { hash, receipt };
}

/** Env helpers */
export function envBigint(name: string): bigint {
    const v = requireEnv(name);
    if (!/^\d+$/.test(v)) throw new Error(`Env ${name} must be an unsigned integer (got: ${v})`);
    return BigInt(v);
}
export function envAddress(name: string): Address {
    const v = requireEnv(name);
    if (!v.startsWith("0x") || v.length !== 42) throw new Error(`Env ${name} must be a 20-byte hex (0x...)`);
    return v as Address;
}

/* ────────────────────────────────────────────────────────────────────────────
   Back-compat aliases so scripts can `import { getVoting } from "./utils.js"`
   ──────────────────────────────────────────────────────────────────────────── */
export const getVoting = getVotingContract;
export const getCandidateNft = getCandidateNftContract;
