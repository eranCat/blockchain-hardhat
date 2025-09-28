import { network } from "hardhat";
import type { Address } from "viem";

const VOTING_ADDR: Address =
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

async function main() {
    const { viem } = await network.connect();

    const publicClient = await viem.getPublicClient();
    console.log("Chain ID:", await publicClient.getChainId());
    const [wallet] = await viem.getWalletClients();
    console.log("Wallet address:", await wallet.getAddresses());

    const voting = await viem.getContractAt("Voting", VOTING_ADDR);

    const owner = await voting.read.owner(); // ✅ exists if Voting is Ownable
    console.log("owner:", owner);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
