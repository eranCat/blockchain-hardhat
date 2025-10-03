import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import * as fs from "fs";

async function main() {
    const voters: string[] = JSON.parse(fs.readFileSync("./data/voters.json", "utf8"));

    // StandardMerkleTree expects [value] for each leaf
    const leaves = voters.map(addr => [addr]);

    // Build tree - OpenZeppelin handles encoding internally
    const tree = StandardMerkleTree.of(leaves, ["address"]);
    const root = tree.root;

    console.log("Root:", root);

    const proofsObj: Record<string, string[]> = {};
    for (const [i, v] of tree.entries()) {
        const addr = v[0].toLowerCase();
        proofsObj[addr] = tree.getProof(i);
    }

    fs.writeFileSync("./data/proofs/proofs.json", JSON.stringify(proofsObj, null, 2));
    fs.writeFileSync("./data/proofs/root.txt", root);
}

main();