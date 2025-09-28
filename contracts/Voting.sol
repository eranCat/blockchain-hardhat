// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { BALToken } from "./BALToken.sol";

/**
 * @title Voting
 * @dev A voting contract with:
 *  - Admin can add candidates and set a Merkle root for eligible voters
 *  - Time-window for voting
 *  - Rewards: each eligible voter receives 10 BAL from BALToken
 *  - Supports querying ranking after campaign ends
 */
contract Voting is Ownable {
    struct Candidate {
        string name;
        uint256 votes;
    }

    bytes32 public votersMerkleRoot;
    uint256 public startTime;
    uint256 public endTime;
    bool public resultsFinalized;

    BALToken public immutable bal;

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed id, string name);
    event ElectionWindowSet(uint256 start, uint256 end);
    event Voted(address indexed voter, uint256 indexed candidateId);
    event Finalized();

    constructor(address owner_, address balAddress) Ownable(owner_) {
        bal = BALToken(balAddress);
    }

    /** ADMIN FUNCTIONS **/

    function addCandidate(string calldata name) external onlyOwner {
        candidates.push(Candidate(name, 0));
        emit CandidateAdded(candidates.length - 1, name);
    }

    function setVotersMerkleRoot(bytes32 root) external onlyOwner {
        require(startTime == 0 || block.timestamp < startTime, "Already started");
        votersMerkleRoot = root;
    }

    function setElectionWindow(uint256 _start, uint256 _end) external onlyOwner {
        require(_end > _start, "End must be after start");
        require(_start > block.timestamp, "Start must be future");
        startTime = _start;
        endTime = _end;
        resultsFinalized = false;
        emit ElectionWindowSet(_start, _end);
    }

    function finalizeResults() external onlyOwner {
        require(endTime != 0 && block.timestamp > endTime, "Not ended yet");
        resultsFinalized = true;
        emit Finalized();
    }

    /** VOTING **/

    function vote(bytes32[] calldata proof, uint256 candidateId) external {
        require(startTime != 0 && block.timestamp >= startTime && block.timestamp <= endTime, "Voting not open");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateId < candidates.length, "Invalid candidate");

        // Verify the voter is in the Merkle tree
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, votersMerkleRoot, leaf), "Not eligible");

        hasVoted[msg.sender] = true;
        candidates[candidateId].votes += 1;

        // Reward 10 BAL tokens (assumes BAL has minting permission)
        bal.mint(msg.sender, 10 * (10 ** bal.decimals()));
        emit Voted(msg.sender, candidateId);
    }

    /** VIEW FUNCTIONS **/

    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 idx) external view returns (string memory name, uint256 votes) {
        require(idx < candidates.length, "Index out of range");
        Candidate storage c = candidates[idx];
        return (c.name, c.votes);
    }

    function getRanking() external view returns (Candidate[] memory) {
        require(resultsFinalized, "Results not finalized");
        // copy into memory
        Candidate[] memory arr = new Candidate[](candidates.length);
        for (uint i = 0; i < candidates.length; i++) {
            arr[i] = candidates[i];
        }
        // simple sort (bubble/selection) descending by votes
        for (uint i = 0; i < arr.length; i++) {
            for (uint j = i + 1; j < arr.length; j++) {
                if (arr[j].votes > arr[i].votes) {
                    Candidate memory temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
        return arr;
    }
}
