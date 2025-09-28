import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Voting e2e", () => {
    it("rewards a voter with 10 BAL", async () => {
        const { viem } = await network.connect();
        const [wallet] = await viem.getWalletClients();

        const bal = await viem.deployContract("contracts/BALToken.sol:BALToken", [
            "BAL (Eran)", "BAL", wallet.account.address,
        ]);

        const voting = await viem.deployContract("contracts/Voting.sol:Voting", [
            wallet.account.address, bal.address,
        ]);

        await bal.write.setMinter([voting.address]);
    });
});
