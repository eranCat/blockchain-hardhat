import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const voters = ["0x669b237a521621a7Bc242a18B94f695f52340B9A"];

// Create tree with raw addresses - StandardMerkleTree will hash them
const tree = StandardMerkleTree.of(
    voters.map(addr => [addr]),
    ["address"]
);

console.log("Merkle Root:", tree.root);

// Get proof
const proof = tree.getProof([voters[0]]);
console.log("Proof:", proof);

// Save
const outputDir = join(process.cwd(), "data", "proofs");
mkdirSync(outputDir, { recursive: true });

const outputPath = join(outputDir, "proofs.json");
writeFileSync(outputPath, JSON.stringify(tree.dump(), null, 2));

console.log("Saved to:", outputPath);