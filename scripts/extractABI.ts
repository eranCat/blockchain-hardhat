// scripts/extractABI.ts
// Copy ABIs from Hardhat artifacts to your frontend folder.
//
// Usage:
//   npx tsx scripts/extractABI.ts
//
// Env (optional):
//   FRONTEND_ABI_DIR=frontend/src/contracts

import * as fs from "fs";
import * as path from "path";

const CONTRACTS = ["Voting", "BALToken", "CandidateNFT"];
const OUT_DIR =
    process.env.FRONTEND_ABI_DIR?.trim() ||
    path.resolve("frontend", "src", "contracts");

async function findArtifact(contract: string): Promise<string> {
    const guesses = [
        path.resolve("artifacts", "contracts", `${contract}.sol`, `${contract}.json`),
        path.resolve("artifacts", `${contract}.sol`, `${contract}.json`),
    ];
    const found = guesses.find((p) => fs.existsSync(p));
    if (!found) {
        throw new Error(
            `Artifact not found for "${contract}". Did you run "npx hardhat compile"?\n` +
            guesses.map((g) => ` - ${g}`).join("\n")
        );
    }
    return found;
}

async function copyOne(contract: string): Promise<void> {
    const artifactPath = await findArtifact(contract);
    const artifact = JSON.parse(await fs.promises.readFile(artifactPath, "utf8"));
    if (!artifact?.abi) throw new Error(`Missing "abi" in ${artifactPath}`);

    await fs.promises.mkdir(OUT_DIR, { recursive: true });
    const dest = path.join(OUT_DIR, `${contract}.abi.json`);
    await fs.promises.writeFile(dest, JSON.stringify(artifact.abi, null, 2));
    console.log(`✔ Wrote ${path.relative(process.cwd(), dest)}`);
}

export async function copyABIs(): Promise<void> {
    for (const c of CONTRACTS) await copyOne(c);
    console.log(`✅ ABIs copied to ${OUT_DIR}`);
}

export default copyABIs;

// CLI
if (require.main === module) {
    copyABIs().catch((err) => {
        console.error("ABI copy failed:", (err as Error).message);
        process.exit(1);
    });
}
