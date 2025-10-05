import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VotingModule", (m) => {
    // BALToken(name, symbol, owner)
    const balToken = m.contract("BALToken", [
        "Ballot Token",
        "BAL",
        m.getAccount(0)
    ]);

    // CandidateNFT(owner)
    const candidateNFT = m.contract("CandidateNFT", [m.getAccount(0)]);

    // Voting(balAddress, rewardPerVote, nftAddress)
    const voting = m.contract("Voting", [
        balToken,
        10n * 10n ** 18n, // 10 BAL tokens reward
        candidateNFT
    ]);

    // Set voting contract as minter
    m.call(balToken, "setMinter", [voting]);

    // Transfer NFT ownership to Voting
    m.call(candidateNFT, "transferOwnership", [voting]);

    return { balToken, candidateNFT, voting };
});