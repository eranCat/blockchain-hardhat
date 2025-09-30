// scripts/generateProofs.ts
import fs from "node:fs";
import path from "node:path";
import { MerkleTree } from "merkletreejs";
import { encodePacked, keccak256, type Hex } from "viem";
import { Alchemy, Network, type GetOwnersForContractOptions } from "alchemy-sdk";
import "dotenv/config";

function hashBuf(buf: Buffer): Buffer {
    // viem.keccak256 returns 0x…; convert to Buffer for merkletreejs
    return Buffer.from(keccak256(buf as unknown as Uint8Array).slice(2), "hex");
}
function parseArg(name: string): string | undefined {
    const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
    if (withEq) return withEq.split("=")[1];
    const idx = process.argv.findIndex((a) => a === `--${name}`);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
    return undefined;
}
function ensureDir(p: string) {
    const d = path.dirname(p);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
function leafFor(addr: string): Hex {
    const a = addr.toLowerCase() as `0x${string}`;
    return keccak256(encodePacked(["address"], [a]));
}

async function fetchOwnersAlchemy(contract: string): Promise<string[]> {
    const HARDHAT_NETWORK = (process.env.HARDHAT_NETWORK ?? "").toLowerCase();
    const ALCHEMY_NETWORK = process.env.ALCHEMY_NETWORK ?? (HARDHAT_NETWORK === "sepolia" ? "ETH_SEPOLIA" : "ETH_MAINNET");
    if (!(ALCHEMY_NETWORK in Network)) throw new Error(`Invalid ALCHEMY_NETWORK=${ALCHEMY_NETWORK}`);

    const alchemy = new Alchemy({
        apiKey: process.env.ALCHEMY_API_KEY || "",
        network: Network[ALCHEMY_NETWORK as keyof typeof Network],
    });
    if (!process.env.ALCHEMY_API_KEY) throw new Error("Missing ALCHEMY_API_KEY");

    const owners = new Set<string>();
    let pageKey: string | undefined;
    const baseOpts: GetOwnersForContractOptions = { withTokenBalances: false };

    do {
        const resp = await alchemy.nft.getOwnersForContract(contract, { ...baseOpts, pageKey });
        for (const entry of resp.owners ?? []) {
            if (typeof entry === "string") owners.add(entry.toLowerCase());
            else if (entry && typeof entry === "object" && "ownerAddress" in entry) {
                const addr = (entry as { ownerAddress?: string }).ownerAddress;
                if (addr) owners.add(addr.toLowerCase());
            }
        }
        pageKey = (resp as any).pageKey ?? undefined;
    } while (pageKey);

    return Array.from(owners);
}

async function main() {
    const nftContract = parseArg("nft-contract") ?? parseArg("contract");
    let voters: string[];

    if (nftContract) {
        console.log(`[proofs] fetching owners from Alchemy for contract ${nftContract}...`);
        voters = await fetchOwnersAlchemy(nftContract);
    } else {
        const votersPath = process.env.VOTERS_FILE ?? "data/voters.json";
        voters = JSON.parse(fs.readFileSync(votersPath, "utf8"));
    }

    if (!Array.isArray(voters) || voters.length === 0) throw new Error("No voters found.");
    // leaves
    const leaves = voters.map((v) => Buffer.from(leafFor(v).slice(2), "hex"));
    const tree = new MerkleTree(leaves, hashBuf, { sortPairs: true });

    const rootHex = ("0x" + tree.getRoot().toString("hex")) as Hex;

    // proofs per address
    const proofs: Record<string, Hex[]> = {};
    for (const v of voters) {
        const leafBuf = Buffer.from(leafFor(v).slice(2), "hex");
        const proofHex = tree.getProof(leafBuf).map((p) => ("0x" + p.data.toString("hex")) as Hex);
        proofs[v.toLowerCase()] = proofHex;
    }

    const proofsFile = path.resolve("data/proofs/proofs.json");
    const rootFile = path.resolve("data/proofs/root.txt");
    ensureDir(proofsFile);
    fs.writeFileSync(proofsFile, JSON.stringify(proofs, null, 2), "utf8");
    fs.writeFileSync(rootFile, rootHex + "\n", "utf8");

    console.log(`✅ Merkle root: ${rootHex}`);
    console.log(`📝 Wrote ${proofsFile} & ${rootFile}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
