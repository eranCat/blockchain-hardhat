// scripts/checkProof.ts
import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";

type Hex = `0x${string}`;
type ProofEntry = { address: string; proof: Hex[] };
type ProofFile =
    | { root: Hex; proofs: Record<string, Hex[]> }
    | { root: Hex; voters: ProofEntry[] }
    | { root: Hex; entries: ProofEntry[] }
    | { root: Hex; list: ProofEntry[] }
    | { root: Hex; proofs: ProofEntry[] }
    | { root?: Hex;[k: string]: any };

function getArg(k: string, d?: string) {
    const args = process.argv.slice(2);
    const i = args.findIndex(a => a === `--${k}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : d;
}

function normalizeHex<T extends string>(x: T | undefined): T | undefined {
    return typeof x === "string" ? (x as T) : undefined;
}

function findProof(pf: ProofFile, addr: string): Hex[] | undefined {
    const lower = addr.toLowerCase();

    // Map shape: { proofs: { "0x..": [ .. ] } }
    if (pf && pf.proofs && !Array.isArray(pf.proofs)) {
        const keys = Object.keys(pf.proofs as Record<string, Hex[]>);
        const hit = keys.find(k => k.toLowerCase() === lower);
        if (hit) return (pf.proofs as Record<string, Hex[]>)[hit];
    }

    // Array shapes: voters / entries / list / proofs: [ { address, proof } ]
    for (const k of ["voters", "entries", "list", "proofs"]) {
        const arr = (pf as any)[k];
        if (Array.isArray(arr)) {
            const found = arr.find((it: any) => typeof it?.address === "string" && it.address.toLowerCase() === lower);
            if (found?.proof && Array.isArray(found.proof)) return found.proof as Hex[];
        }
    }

    return undefined;
}

async function main() {
    const FILE = getArg("file", "data/proofs/proofs.json")!;
    const ADDR = (getArg("addr") ?? "").toLowerCase();
    const VOTING = (getArg("voting") ?? "").toLowerCase();
    const CANDIDATE = Number(getArg("candidate", "0"));
    const RPC =
        getArg("rpc") ||
        process.env.VITE_SEPOLIA_RPC_URL ||
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/YOUR_KEY";

    if (!/^0x[a-fA-F0-9]{40}$/.test(ADDR)) throw new Error("bad --addr");
    if (!/^0x[a-fA-F0-9]{40}$/.test(VOTING)) throw new Error("bad --voting");

    const jsonPath = path.resolve(FILE);
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`Proof file not found: ${jsonPath}`);
    }

    const raw = fs.readFileSync(jsonPath, "utf8");
    let pf: ProofFile;
    try {
        pf = JSON.parse(raw);
    } catch {
        throw new Error(`Invalid JSON in ${jsonPath}`);
    }

    const root = normalizeHex<Hex>((pf as any).root);
    const proof = findProof(pf, ADDR);

    // Diagnostics: show what the file contains
    const diag = {
        hasRoot: !!root,
        hasMapProofs: pf && pf.proofs && !Array.isArray(pf.proofs) && Object.keys(pf.proofs).length,
        arrayBuckets: ["voters", "entries", "list", "proofs"]
            .map(k => ({ [k]: Array.isArray((pf as any)[k]) ? (pf as any)[k].length : 0 }))
    };
    console.log("🔎 File:", jsonPath, JSON.stringify(diag));

    if (!root || !root.startsWith("0x") || root.length !== 66) {
        throw new Error("root missing or invalid in proofs file");
    }
    if (!proof || !proof.length) {
        throw new Error(`no proof for ${ADDR} in proofs file`);
    }

    // Recompute (OZ sorted pairs)
    const leaf = ethers.solidityPackedKeccak256(["address"], [ADDR]) as Hex;
    const hashPair = (a: Hex, b: Hex): Hex =>
        (a.toLowerCase() < b.toLowerCase()
            ? ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [a, b])
            : ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [b, a])) as Hex;

    let computed = leaf;
    for (const p of proof) computed = hashPair(computed, p);

    console.log("👤 Address:   ", ADDR);
    console.log("🌿 Leaf:      ", leaf);
    console.log("🔗 Proof len: ", proof.length);
    console.log("🧮 Computed:  ", computed);
    console.log("📦 Root(file):", root);

    // On-chain compare + simulate
    const provider = new ethers.JsonRpcProvider(RPC);
    const artifact = JSON.parse(fs.readFileSync("artifacts/contracts/Voting.sol/Voting.json", "utf8"));
    const iface = new ethers.Interface(artifact.abi);

    const callRes = await provider.call({ to: VOTING, data: iface.encodeFunctionData("voterRoot", []) });
    const onChainRoot = iface.decodeFunctionResult("voterRoot", callRes)[0] as Hex;
    console.log("⛓️  Root(chain):", onChainRoot);
    console.log(computed === root ? "✅ Computed == Root(file)" : "❌ Computed != Root(file)");
    console.log(onChainRoot === root ? "✅ Root(chain) == Root(file)" : "❌ Root(chain) != Root(file)");

    try {
        const data = iface.encodeFunctionData("vote", [BigInt(CANDIDATE), proof]);
        await provider.call({ to: VOTING, data, from: ADDR });
        console.log("🧪 vote() simulation: ✅ would succeed");
    } catch (e: any) {
        console.log("🧪 vote() simulation: ❌ would revert");
        console.log("Reason:", e?.shortMessage || e?.message || String(e));
    }
}

main().catch((e) => { console.error("❌", e?.message || e); process.exit(1); });
