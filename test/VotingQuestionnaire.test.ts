import { expect } from "chai";
import { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Voting - Questionnaire Feature", function () {
    let voting: any;
    let balToken: any;
    let candidateNFT: any;
    let owner: any;
    let voter1: any;
    let voter2: any;
    let voter3: any;
    let merkleTree: any;
    let merkleRoot: string;

    beforeEach(async function () {
        [owner, voter1, voter2, voter3] = await ethers.getSigners();

        // Deploy BAL Token
        const BALToken = await ethers.getContractFactory("BALToken");
        balToken = await BALToken.deploy(ethers.parseEther("1000000"));

        // Deploy CandidateNFT
        const CandidateNFT = await ethers.getContractFactory("CandidateNFT");
        candidateNFT = await CandidateNFT.deploy();

        // Deploy Voting
        const Voting = await ethers.getContractFactory("Voting");
        voting = await Voting.deploy(
            await balToken.getAddress(),
            ethers.parseEther("10"),
            await candidateNFT.getAddress()
        );

        // Grant MINTER_ROLE
        const MINTER_ROLE = await balToken.MINTER_ROLE();
        await balToken.grantRole(MINTER_ROLE, await voting.getAddress());
        await candidateNFT.grantRole(MINTER_ROLE, await voting.getAddress());

        // Setup Merkle tree
        const voters = [
            [voter1.address],
            [voter2.address],
            [voter3.address]
        ];
        merkleTree = StandardMerkleTree.of(voters, ["address"]);
        merkleRoot = merkleTree.root;
        await voting.setMerkleRoot(merkleRoot);

        // Add candidates with positions
        // Alice: [8, 3, 6] - Free market, traditional, somewhat interventionist
        // Bob: [2, 9, 4] - Gov control, progressive, moderate
        // Charlie: [5, 5, 8] - Moderate all, very interventionist
        await voting.addCandidate("Alice", [8, 3, 6]);
        await voting.addCandidate("Bob", [2, 9, 4]);
        await voting.addCandidate("Charlie", [5, 5, 8]);

        // Set voting window
        const now = Math.floor(Date.now() / 1000);
        await voting.setWindow(now, now + 3600);
    });

    describe("Questionnaire Voting", function () {
        it("Should vote for closest matching candidate", async function () {
            const proof = merkleTree.getProof([voter1.address]);

            // Voter positions: [8, 3, 7] - very close to Alice [8, 3, 6]
            await voting.connect(voter1).voteByQuestionnaire([8, 3, 7], proof);

            const [names, votes] = await voting.getResults();
            expect(votes[0]).to.equal(1n); // Alice should get the vote
            expect(votes[1]).to.equal(0n);
            expect(votes[2]).to.equal(0n);
        });

        it("Should match progressive voter to Bob", async function () {
            const proof = merkleTree.getProof([voter2.address]);

            // Voter positions: [3, 10, 5] - closest to Bob [2, 9, 4]
            await voting.connect(voter2).voteByQuestionnaire([3, 10, 5], proof);

            const [names, votes] = await voting.getResults();
            expect(votes[0]).to.equal(0n);
            expect(votes[1]).to.equal(1n); // Bob should get the vote
            expect(votes[2]).to.equal(0n);
        });

        it("Should match moderate voter to Charlie", async function () {
            const proof = merkleTree.getProof([voter3.address]);

            // Voter positions: [5, 6, 9] - closest to Charlie [5, 5, 8]
            await voting.connect(voter3).voteByQuestionnaire([5, 6, 9], proof);

            const [names, votes] = await voting.getResults();
            expect(votes[0]).to.equal(0n);
            expect(votes[1]).to.equal(0n);
            expect(votes[2]).to.equal(1n); // Charlie should get the vote
        });

        it("Should emit Voted event with isAnonymous=true", async function () {
            const proof = merkleTree.getProof([voter1.address]);

            await expect(voting.connect(voter1).voteByQuestionnaire([8, 3, 7], proof))
                .to.emit(voting, "Voted")
                .withArgs(voter1.address, 0, true); // candidateId=0 (Alice), isAnonymous=true
        });

        it("Should mint BAL reward for questionnaire vote", async function () {
            const proof = merkleTree.getProof([voter1.address]);

            await voting.connect(voter1).voteByQuestionnaire([8, 3, 7], proof);

            const balance = await balToken.balanceOf(voter1.address);
            expect(balance).to.equal(ethers.parseEther("10"));
        });

        it("Should prevent double voting via questionnaire", async function () {
            const proof = merkleTree.getProof([voter1.address]);

            await voting.connect(voter1).voteByQuestionnaire([8, 3, 7], proof);

            await expect(
                voting.connect(voter1).voteByQuestionnaire([2, 9, 4], proof)
            ).to.be.revertedWithCustomError(voting, "AlreadyVoted");
        });

        it("Should revert with invalid position values", async function () {
            const proof = merkleTree.getProof([voter1.address]);

            await expect(
                voting.connect(voter1).voteByQuestionnaire([8, 3, 11], proof) // 11 > 10
            ).to.be.revertedWithCustomError(voting, "InvalidPosition");
        });

        it("Should calculate distance correctly for tie-breaker", async function () {
            const proof = merkleTree.getProof([voter1.address]);

            // Exactly between Alice and Bob - should pick first match (Alice)
            await voting.connect(voter1).voteByQuestionnaire([5, 6, 5], proof);

            const [names, votes] = await voting.getResults();
            // In case of equal distance, first candidate wins
            expect(Number(votes[0])).to.be.greaterThan(0);
        });
    });

    describe("Mixed Voting", function () {
        it("Should allow direct and questionnaire votes in same election", async function () {
            const proof1 = merkleTree.getProof([voter1.address]);
            const proof2 = merkleTree.getProof([voter2.address]);
            const proof3 = merkleTree.getProof([voter3.address]);

            // voter1: direct vote for Bob
            await voting.connect(voter1).vote(1, proof1);

            // voter2: questionnaire vote (should match Alice)
            await voting.connect(voter2).voteByQuestionnaire([8, 3, 6], proof2);

            // voter3: questionnaire vote (should match Bob)
            await voting.connect(voter3).voteByQuestionnaire([2, 9, 4], proof3);

            const [names, votes] = await voting.getResults();
            expect(votes[0]).to.equal(1n); // Alice: 1 (questionnaire)
            expect(votes[1]).to.equal(2n); // Bob: 2 (1 direct + 1 questionnaire)
            expect(votes[2]).to.equal(0n); // Charlie: 0
        });
    });

    describe("View Functions", function () {
        it("Should return candidate details with positions", async function () {
            const [names, positions, votes] = await voting.getCandidateDetails();

            expect(names.length).to.equal(3);
            expect(names[0]).to.equal("Alice");
            expect(positions[0]).to.deep.equal([8, 3, 6]);
            expect(votes[0]).to.equal(0n);
        });

        it("Should return individual candidate with positions", async function () {
            const [name, positions, voteCount] = await voting.getCandidate(0);

            expect(name).to.equal("Alice");
            expect(positions).to.deep.equal([8, 3, 6]);
            expect(voteCount).to.equal(0n);
        });
    });

    describe("NFT Integration", function () {
        it("Should mint NFT when adding candidate", async function () {
            // Check NFT was minted (nextId should be 3 after 3 candidates)
            const nextId = await candidateNFT.nextId();
            expect(nextId).to.equal(3n);
        });
    });
});