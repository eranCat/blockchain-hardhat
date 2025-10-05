import hre from "hardhat";

async function main() {
    console.log("Connecting to contract...");
    const voting = await hre.ethers.getContractAt(
        "Voting",
        "0x7022a518d4f19eb0bd610d45b4a91d171eb5bc82"
    );

    const now = Math.floor(Date.now() / 1000);
    console.log("Sending transaction...");
    const tx = await voting.setVotingWindow(now, now + 30 * 24 * 60 * 60);
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Window set");
}

main().catch(console.error);