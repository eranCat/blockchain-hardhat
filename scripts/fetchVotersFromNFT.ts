// scripts/fetchVotersFromNFT.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Alchemy, Network, type GetOwnersForContractOptions } from "alchemy-sdk";
import "dotenv/config";

function parseArg(name: string): string | undefined {
    // supports: --name=value  OR  --name value
    const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
    if (withEq) return withEq.split("=")[1];
    const idx = process.argv.findIndex((a) => a === `--${name}`);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
    return undefined;
}

const outDir = path.resolve("data/voters");
function out(file: string) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    return path.join(outDir, file);
}
function env(name: string, fallback?: string) {
    const v = process.env[name] ?? fallback;
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

const CONTRACT_ADDR =
    parseArg("contract") ??
    process.env.NFT_COLLECTION_ADDR ??
    process.env.VOTER_NFT_ADDR ??
    process.env.CANDIDATE_NFT_ADDR ??
    "";

if (!CONTRACT_ADDR) {
    throw new Error(
        "No contract address provided. Pass --contract 0x... (or --contract=0x...) or set NFT_COLLECTION_ADDR / VOTER_NFT_ADDR / CANDIDATE_NFT_ADDR."
    );
}

const HARDHAT_NETWORK = (process.env.HARDHAT_NETWORK ?? "").toLowerCase();
const ALCHEMY_NETWORK = process.env.ALCHEMY_NETWORK ?? (HARDHAT_NETWORK === "sepolia" ? "ETH_SEPOLIA" : "ETH_MAINNET");
if (!(ALCHEMY_NETWORK in Network)) {
    throw new Error(`Invalid ALCHEMY_NETWORK="${ALCHEMY_NETWORK}". Use one of: ${Object.keys(Network).join(", ")}`);
}

const alchemy = new Alchemy({
    apiKey: env("ALCHEMY_API_KEY"),
    network: Network[ALCHEMY_NETWORK as keyof typeof Network],
});

async function main() {
    console.log(`[fetch] contract=${CONTRACT_ADDR} network=${ALCHEMY_NETWORK}`);
    const owners = new Set<string>();
    let pageKey: string | undefined;

    const baseOpts: GetOwnersForContractOptions = { withTokenBalances: false };

    do {
        const resp = await alchemy.nft.getOwnersForContract(CONTRACT_ADDR, { ...baseOpts, pageKey });
        for (const entry of resp.owners ?? []) {
            if (typeof entry === "string") owners.add(entry.toLowerCase());
            else if (entry && typeof entry === "object" && "ownerAddress" in entry) {
                const addr = (entry as { ownerAddress?: string }).ownerAddress;
                if (addr) owners.add(addr.toLowerCase());
            }
        }
        pageKey = (resp as any).pageKey ?? undefined;
        if (pageKey) console.log("...next page");
    } while (pageKey);

    const list = Array.from(owners);
    const ownersJsonPath = out("owners.json");
    const addressesTxtPath = out("addresses.txt");
    const votersJsonPath = path.resolve("data", "voters.json"); // for generateProofs fallback

    writeFileSync(
        ownersJsonPath,
        JSON.stringify({ contract: CONTRACT_ADDR, network: ALCHEMY_NETWORK, count: list.length, owners: list, generatedAt: new Date().toISOString() }, null, 2),
        "utf8"
    );
    writeFileSync(addressesTxtPath, list.join("\n"), "utf8");
    // also write a simple list usable by generators
    if (!existsSync(path.dirname(votersJsonPath))) mkdirSync(path.dirname(votersJsonPath), { recursive: true });
    writeFileSync(votersJsonPath, JSON.stringify(list, null, 2), "utf8");

    console.log(`✅ Wrote ${list.length} owners\n - ${ownersJsonPath}\n - ${addressesTxtPath}\n - ${votersJsonPath}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
