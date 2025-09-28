import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VotingModule", (m) => {
    const owner = m.getAccount(0);
    const bal = m.contract("BALToken", ["BAL (Eran)", "BAL", owner]);
    const nft = m.contract("CandidateNFT", [owner]);
    const rewardPerVote = 1000n;
    const voting = m.contract("Voting", [bal, rewardPerVote]);

    m.call(bal, "setMinter", [voting], { id: "authorizeMinter" });
    return { bal, nft, voting };
});
