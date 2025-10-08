// scripts/setRoot.ts  (Hardhat runtime; no PRIVATE_KEY needed)
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type Hex = `0x${string}`;

const args = process.argv.slice(2);
const getArg = (k: string, d?: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

async function main() {
    const VOTING = getArg("voting");
    const FILE = getArg("file", "data/proofs/proofs.json");
    let ROOT = getArg("root") as Hex | undefined;

    if (!VOTING || !/^0x[0-9a-fA-F]{40}$/.test(VOTING)) {
        throw new Error("Missing/invalid --voting 0x...");
    }

    if (!ROOT) {
        const p = path.resolve(FILE);
        if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
        const obj = JSON.parse(fs.readFileSync(p, "utf8"));
        if (typeof obj?.root === "string" && obj.root.startsWith("0x")) {
            ROOT = obj.root as Hex;
        } else if (obj?.format === "standard-v1" && Array.isArray(obj.tree) && obj.tree[0]) {
            ROOT = obj.tree[0] as Hex;
        } else {
            throw new Error("No root found in file (expect {root} or standard-v1 with tree[0]).");
        }
    }

    const [signer] = await ethers.getSigners();
    console.log("Signer:", await signer.getAddress());
    console.log("Voting:", VOTING);
    console.log("Root:", ROOT);

    const voting = await ethers.getContractAt("Voting", VOTING, signer);
    const tx = await voting.setVoterRoot(ROOT!);
    console.log("tx:", tx.hash);
    await tx.wait(1);

    console.log("✅ on-chain root:", await voting.voterRoot());
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
