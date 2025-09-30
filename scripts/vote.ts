import { network } from "hardhat";
import type { Address, Hex } from "viem";


async function loadProof(): Promise<readonly Hex[]> {
    // TODO: if you have PROOFS_PATH & VOTER_ADDR, load your proof here and return as Hex[]
    // Example minimal default (no proof required / allow-list off):
    return [] as const;
}

async function main() {
    const { viem } = await network.connect();

    const publicClient = await viem.getPublicClient();
    console.log("Chain ID:", await publicClient.getChainId());

    const [wallet] = await viem.getWalletClients();
    console.log("Wallet address:", await wallet.getAddresses());

    // Resolve address per-network (SEPOLIA/LOCALHOST) and export for utils that read process.env


    const voting = await viem.getContractAt(
        "Voting",
        process.env.VOTING_ADDR as Address
    );

    // Debug: confirm we are talking to the right contract
    const owner = await voting.read.owner();
    console.log("owner:", owner);

    // Candidate index (0/1/2 for Alice/Bob/Charlie)
    const rawIdx = process.env.CANDIDATE_ID ?? "0";
    const candidateIdx = BigInt(Number(rawIdx));

    // Merkle proof (bytes32[]) — must be typed as readonly Hex[]
    const proof = await loadProof(); // returns [] if you don’t need proofs

    // ---- simulate first (recommended by viem) ----
    console.log(`Simulating vote(${candidateIdx})...`);
    const sim = await voting.simulate.vote([candidateIdx, proof]);
    console.log("✅ Simulation OK:", sim.request);

    // ---- send the tx ----
    const txHash = await voting.write.vote([candidateIdx, proof]);
    console.log("✅ Vote tx:", txHash);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
