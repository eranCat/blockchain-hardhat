// test/bal-token.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BALToken", () => {
    it("deploys BALToken and reads symbol", async () => {
        const { viem } = await network.connect();                 // HH3 way
        const [wallet] = await viem.getWalletClients();           // wallet client

        // FQN avoids “artifact not found” if there are duplicates:
        const bal = await viem.deployContract(
            "contracts/BALToken.sol:BALToken",                      // or "BALToken" if unique
            ["BAL (Osher)", "BAL", wallet.account.address]
        );

        const symbol = await bal.read.symbol();                   // typed via ABI
        assert.equal(symbol, "BAL");
    });
});
