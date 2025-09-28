import { network } from "hardhat";

async function main() {
    const { viem } = await network.connect();
    const [wallet] = await viem.getWalletClients();
    console.log("Deployer:", wallet.account.address);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
