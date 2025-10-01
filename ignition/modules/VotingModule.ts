import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VotingModule", (m) => {
    const balToken = m.contract("BALToken", [1_000_000n * 10n ** 18n]);
    const candidateNFT = m.contract("CandidateNFT");
    const voting = m.contract("Voting", [balToken, 10n * 10n ** 18n, candidateNFT]);

    const minterRole = m.staticCall(balToken, "MINTER_ROLE");
    m.call(balToken, "grantRole", [minterRole, voting]);

    const nftMinterRole = m.staticCall(candidateNFT, "MINTER_ROLE");
    m.call(candidateNFT, "grantRole", [nftMinterRole, voting]);

    return { balToken, candidateNFT, voting };
});