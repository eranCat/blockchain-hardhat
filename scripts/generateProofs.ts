import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

// Read voters from voters.json
const votersPath = join(process.cwd(), "data", "voters.json");
const voters: string[] = JSON.parse(readFileSync(votersPath, "utf-8"));

console.log("Voters:", voters);

// Create tree with raw addresses
const tree = StandardMerkleTree.of(
    voters.map(addr => [addr]),
    ["address"]
);

console.log("Merkle Root:", tree.root);

// Get proof for first voter (for testing)
const proof = tree.getProof([voters[0]]);
console.log("Proof for", voters[0], ":", proof);

// Save tree
const outputDir = join(process.cwd(), "data", "proofs");
mkdirSync(outputDir, { recursive: true });

const outputPath = join(outputDir, "proofs.json");
writeFileSync(outputPath, JSON.stringify(tree.dump(), null, 2));

console.log("Saved to:", outputPath);
console.log("\n⚠️  Add this to your .env:");
console.log(`VOTER_MERKLE_ROOT=${tree.root}`);