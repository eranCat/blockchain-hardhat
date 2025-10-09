// test/voting.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Voting, BALToken, CandidateNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Voting - Session Reset Behavior", function () {
    let voting: Voting;
    let balToken: BALToken;
    let candidateNFT: CandidateNFT;
    let owner: SignerWithAddress;
    let voter: SignerWithAddress;
    let merkleRoot: string;
    let voterProof: string[];

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

    // Generate Merkle tree for voters
    function generateMerkleTree(addresses: string[]): { root: string; proofs: Record<string, string[]> } {
        const leaves = addresses.map(addr =>
            ethers.solidityPackedKeccak256(["address"], [addr])
        );

        const hashPair = (a: string, b: string): string => {
            return a.toLowerCase() < b.toLowerCase()
                ? ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [a, b])
                : ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [b, a]);
        };

        function buildLayers(currentLayer: string[]): string[][] {
            const layers: string[][] = [currentLayer];
            while (layers[layers.length - 1].length > 1) {
                const prev = layers[layers.length - 1];
                const next: string[] = [];
                for (let i = 0; i < prev.length; i += 2) {
                    next.push(i + 1 < prev.length ? hashPair(prev[i], prev[i + 1]) : prev[i]);
                }
                layers.push(next);
            }
            return layers;
        }

        function getProof(index: number, layers: string[][]): string[] {
            const proof: string[] = [];
            let idx = index;
            for (let lvl = 0; lvl < layers.length - 1; lvl++) {
                const sib = idx ^ 1;
                if (sib < layers[lvl].length) proof.push(layers[lvl][sib]);
                idx = Math.floor(idx / 2);
            }
            return proof;
        }

        const layers = buildLayers(leaves);
        const root = layers[layers.length - 1][0];

        const proofs: Record<string, string[]> = {};
        addresses.forEach((addr, i) => {
            proofs[addr] = getProof(i, layers);
        });

        return { root, proofs };
    }

    beforeEach(async function () {
        [owner, voter] = await ethers.getSigners();

        // Generate Merkle tree for voters
        const { root, proofs } = generateMerkleTree([voter.address]);
        merkleRoot = root;
        voterProof = proofs[voter.address];

        // Deploy BALToken
        const BALTokenFactory = await ethers.getContractFactory("BALToken");
        balToken = await BALTokenFactory.deploy("Ballot Token", "BAL", owner.address);
        await balToken.waitForDeployment();

        // Deploy CandidateNFT
        const CandidateNFTFactory = await ethers.getContractFactory("CandidateNFT");
        candidateNFT = await CandidateNFTFactory.deploy(owner.address);
        await candidateNFT.waitForDeployment();

        // Deploy Voting
        const VotingFactory = await ethers.getContractFactory("Voting");
        const rewardPerVote = ethers.parseEther("10");
        voting = await VotingFactory.deploy(
            await balToken.getAddress(),
            await candidateNFT.getAddress(),
            rewardPerVote
        );
        await voting.waitForDeployment();

        // Grant MINTER_ROLE
        await balToken.grantRole(MINTER_ROLE, await voting.getAddress());
        await candidateNFT.grantRole(MINTER_ROLE, await voting.getAddress());

        // Set up candidates
        const names = ["Alice", "Bob"];
        const positions: [number, number, number][] = [[4, 6, 5], [6, 4, 5]];
        const uris = ["ipfs://alice", "ipfs://bob"];
        const receivers = [owner.address, owner.address];

        await voting.setCandidatesWithNFT(names, positions, uris, receivers);

        // Set voter root with valid Merkle root
        await voting.setVoterRoot(merkleRoot);

        // Start election
        const now = Math.floor(Date.now() / 1000);
        await voting.startElection(now - 100, now + 3600);
    });

    it("allows a voter to vote again after starting new election", async function () {
        const initialCount = await voting.candidateCount();
        expect(initialCount).to.equal(2);

        // Voter votes for candidate 0
        await voting.connect(voter).vote(0, voterProof);

        const cand0Before = await voting.getCandidateMeta(0);
        expect(cand0Before[2]).to.equal(1n);

        const hasVotedBefore = await voting.hasVoted(voter.address);
        expect(hasVotedBefore).to.be.true;

        // Start new election
        const now = Math.floor(Date.now() / 1000);
        const newNames = ["Charlie", "Diana"];
        const newPositions: [number, number, number][] = [[5, 5, 5], [7, 3, 8]];
        const newUris = ["ipfs://charlie", "ipfs://diana"];
        const newReceivers = [owner.address, owner.address];

        await voting.setCandidatesWithNFT(newNames, newPositions, newUris, newReceivers);
        await voting.startElection(now - 50, now + 7200);
        await voting.setVoterRoot(merkleRoot);

        const newCount = await voting.candidateCount();
        expect(newCount).to.equal(2);

        const hasVotedAfter = await voting.hasVoted(voter.address);
        expect(hasVotedAfter).to.be.false;

        // Vote again
        await voting.connect(voter).vote(1, voterProof);

        const cand1After = await voting.getCandidateMeta(1);
        expect(cand1After[2]).to.equal(1n);

        const hasVotedFinal = await voting.hasVoted(voter.address);
        expect(hasVotedFinal).to.be.true;
    });

    it("prevents double voting in same election", async function () {
        await voting.connect(voter).vote(0, voterProof);

        await expect(
            voting.connect(voter).vote(1, voterProof)
        ).to.be.revertedWithCustomError(voting, "AlreadyVoted");
    });

    it("verifies vote counts are reset when new election starts", async function () {
        await voting.connect(voter).vote(0, voterProof);

        const cand0FirstElection = await voting.getCandidateMeta(0);
        expect(cand0FirstElection[2]).to.equal(1n);

        const now = Math.floor(Date.now() / 1000);
        await voting.setCandidatesWithNFT(
            ["Eve", "Frank"],
            [[5, 5, 5], [6, 6, 6]],
            ["ipfs://eve", "ipfs://frank"],
            [owner.address, owner.address]
        );
        await voting.startElection(now - 50, now + 3600);
        await voting.setVoterRoot(merkleRoot);

        const cand0NewElection = await voting.getCandidateMeta(0);
        expect(cand0NewElection[2]).to.equal(0n);
    });

    it("reverts when voting is not active", async function () {
        const future = Math.floor(Date.now() / 1000) + 10000;
        await voting.startElection(future, future + 3600);

        await expect(
            voting.connect(voter).vote(0, voterProof)
        ).to.be.revertedWithCustomError(voting, "VotingClosed");
    });

    it("reverts on invalid candidate ID", async function () {
        await expect(
            voting.connect(voter).vote(999, voterProof)
        ).to.be.revertedWithCustomError(voting, "InvalidCandidateId");
    });

    it("returns correct winner", async function () {
        const [, voter1, voter2, voter3] = await ethers.getSigners();

        // Generate proofs for all voters
        const { root, proofs } = generateMerkleTree([
            voter1.address,
            voter2.address,
            voter3.address
        ]);
        await voting.setVoterRoot(root);

        await voting.connect(voter1).vote(0, proofs[voter1.address]);
        await voting.connect(voter2).vote(1, proofs[voter2.address]);
        await voting.connect(voter3).vote(1, proofs[voter3.address]);

        const winnerId = await voting.winnerId();
        expect(winnerId).to.equal(1);

        const winner = await voting.getWinnerWithNft();
        expect(winner[0]).to.equal(1);
        expect(winner[1]).to.equal("Bob");
        expect(winner[2]).to.equal(2n);
    });

    it("mints BAL tokens as rewards", async function () {
        const balanceBefore = await balToken.balanceOf(voter.address);

        await voting.connect(voter).vote(0, voterProof);

        const balanceAfter = await balToken.balanceOf(voter.address);
        const reward = ethers.parseEther("10");

        expect(balanceAfter - balanceBefore).to.equal(reward);
    });
});