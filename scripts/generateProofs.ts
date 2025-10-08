// scripts/generateProofs.ts
import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";

type Hex = `0x${string}`;

// --- IO paths ---
const votersPath = path.resolve("data", "voters.json");
const outDir = path.resolve("data", "proofs");
const outMap = path.join(outDir, "proofs.json");
const outStd = path.join(outDir, "standard-proofs.json");

// --- load voters ---
if (!fs.existsSync(votersPath)) {
    console.error(`❌ Missing ${votersPath}. Create it with an array of addresses.`);
    process.exit(1);
}

const voters = JSON.parse(fs.readFileSync(votersPath, "utf8")) as string[];
if (!Array.isArray(voters) || voters.length === 0) {
    console.error("❌ data/voters.json must be a non-empty array of addresses");
    process.exit(1);
}

// checksummed (bytes used for hashing are the same)
const addrs = voters.map((a) => ethers.getAddress(a));

// --- hashing that matches Voting.sol ---
// leaf = keccak256(abi.encodePacked(address))
const leaf = (addr: string): Hex =>
    ethers.solidityPackedKeccak256(["address"], [addr]) as Hex;

// parent = keccak256(sorted(childA, childB))
const hashPair = (a: Hex, b: Hex): Hex =>
    (a.toLowerCase() < b.toLowerCase()
        ? ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [a, b])
        : ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [b, a])) as Hex;

// build full tree layers
function buildLayers(leaves: Hex[]): Hex[][] {
    const layers: Hex[][] = [];
    layers.push(leaves);
    while (layers[layers.length - 1].length > 1) {
        const prev = layers[layers.length - 1];
        const next: Hex[] = [];
        for (let i = 0; i < prev.length; i += 2) {
            next.push(i + 1 < prev.length ? hashPair(prev[i], prev[i + 1]) : prev[i]);
        }
        layers.push(next);
    }
    return layers;
}

// per-leaf proof
function getProof(index: number, layers: Hex[][]): Hex[] {
    const proof: Hex[] = [];
    let idx = index;
    for (let lvl = 0; lvl < layers.length - 1; lvl++) {
        const layer = layers[lvl];
        const sib = idx ^ 1;
        if (sib < layer.length) proof.push(layer[sib]);
        idx = Math.floor(idx / 2);
    }
    return proof;
}

// compute
const leaves = addrs.map(leaf);
const layers = buildLayers(leaves);
const root = layers[layers.length - 1][0];

// write outputs
fs.mkdirSync(outDir, { recursive: true });

// 1) simple map format
const proofsMap: Record<string, Hex[]> = {};
addrs.forEach((addr, i) => (proofsMap[addr] = getProof(i, layers)));
fs.writeFileSync(
    outMap,
    JSON.stringify({ root, proofs: proofsMap }, null, 2),
    "utf8"
);

// 2) standard-v1 format (works well for small/medium trees)
const flatTree: Hex[] = [];
for (let lvl = layers.length - 1; lvl >= 0; lvl--) {
    for (const node of layers[lvl]) flatTree.push(node);
}
// leaves will be at the tail of flatTree; track treeIndex for each address
// We’ll put values in the same order as voters:
const leafStartIndex = flatTree.length - leaves.length;
const values = addrs.map((addr, i) => ({
    value: [addr],
    treeIndex: leafStartIndex + i,
}));
const standard = {
    format: "standard-v1",
    leafEncoding: ["address"],
    tree: flatTree,
    values,
};

fs.writeFileSync(outStd, JSON.stringify(standard, null, 2), "utf8");

// log
console.log("Voters:", addrs);
console.log("Merkle Root:", root);
addrs.forEach((addr, i) => {
    console.log(`Proof for ${addr} :`, proofsMap[addr]);
});
console.log("Saved:", outMap);
console.log("Saved:", outStd);
console.log("\n⚠️  Add to your .env (if you set root via env):");
console.log(`VOTER_MERKLE_ROOT=${root}`);
