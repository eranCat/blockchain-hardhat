import { expect } from "chai";
import { ethers } from "hardhat";

describe("Voting - session reset behavior", function () {
    it("allows a voter to vote again after session bump / new election", async function () {
        const [owner, voter] = await ethers.getSigners();

        // Deploy BALToken (try constructor with args, fallback to no-arg)
        const BalFactory = await ethers.getContractFactory("BALToken");
        let bal: any;
        try {
            bal = await BalFactory.deploy("Ballot Token", "BAL", await owner.getAddress());
            if ((bal as any).waitForDeployment) await (bal as any).waitForDeployment();
            else if ((bal as any).deployed) await (bal as any).deployed();
        } catch (err) {
            // fallback: try no-arg deploy
            bal = await BalFactory.deploy();
            if ((bal as any).waitForDeployment) await (bal as any).waitForDeployment();
            else if ((bal as any).deployed) await (bal as any).deployed();
        }

        // Resolve deployed BAL address (works with ethers v6 and v5 helpers)
        const balAddr = typeof bal.getAddress === "function" ? await bal.getAddress() : bal.address;

        // Deploy Voting with (balAddress, rewardPerVote)
        const VotingFactory = await ethers.getContractFactory("Voting");
        const voting = await VotingFactory.deploy(balAddr, 0);
        if ((voting as any).waitForDeployment) await (voting as any).waitForDeployment();
        else if ((voting as any).deployed) await (voting as any).deployed();

        // Prepare election: open voting (merkle root = bytes32(0)), two candidates
        const now = Math.floor(Date.now() / 1000);
        const start = now + 1;
        const end = start + 3600;
        const names = ["Alice", "Bob"];
        const positions = [[4, 6, 5], [6, 4, 5]];
        const merkleZero = "0x" + "0".repeat(64);

        const txStart = await voting.startNewElection(start, end, names, positions, merkleZero);
        await txStart.wait?.();

        // Confirm candidates count
        const cnt = await voting.getCandidatesCount();
        expect(Number(cnt.toString())).to.equal(2);

        // Voter votes for candidate 0 in current session
        const voterContract = voting.connect(voter);
        await voterContract.vote(0, []); // open voting -> proof not required

        // Verify candidate 0 got one vote
        const cand0 = await voting.getCandidate(0);
        expect(cand0[2].toString()).to.equal("1"); // votes at index 2

        // Owner bumps session (simulate admin starting new election)
        await voting.bumpSession();

        // Same voter votes again for candidate 1 in new session
        await voterContract.vote(1, []);

        // Verify candidate 1 got one vote
        const cand1 = await voting.getCandidate(1);
        expect(cand1[2].toString()).to.equal("1");
    });
});
