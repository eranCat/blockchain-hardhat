// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @dev Minimal interface for BAL token
interface IBALToken {
    function mint(address to, uint256 amount) external;
}

// -----------------------------------------------------------------------------
// Custom Errors
// -----------------------------------------------------------------------------
error VotingClosed();
error WindowNotSet();
error AlreadyVoted();
error InvalidCandidate(uint256 candidateId);
error InvalidProof();
error ZeroLengthCandidates();
error ZeroAddress();
error BadWindow(uint64 start, uint64 end);

// -----------------------------------------------------------------------------
// Contract
// -----------------------------------------------------------------------------
contract Voting is Ownable, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event CandidatesSet(string[] names);
    event MerkleRootSet(bytes32 root);
    event WindowSet(uint64 start, uint64 end);
    event Voted(address indexed voter, uint256 indexed candidateId);
    event RewardMinted(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    uint64 public start;
    uint64 public end;
    bytes32 public voterRoot;
    string[] internal _candidates;
    mapping(address => bool) public hasVoted;
    mapping(uint256 => uint256) public voteCounts;  // NEW: Track votes per candidate

    IBALToken public immutable balToken;
    uint256 public immutable rewardAmount;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    /// @param balAddress BAL token contract address
    /// @param rewardPerVote Amount of tokens minted to each voter
    constructor(address balAddress, uint256 rewardPerVote) Ownable(msg.sender) {
        if (balAddress == address(0)) revert ZeroAddress();
        balToken = IBALToken(balAddress);
        rewardAmount = rewardPerVote;
    }

    // -------------------------------------------------------------------------
    // Admin (owner-only)
    // -------------------------------------------------------------------------
    function setCandidates(string[] calldata names) external onlyOwner {
        if (names.length == 0) revert ZeroLengthCandidates();

        delete _candidates;
        for (uint256 i = 0; i < names.length; i++) {
            _candidates.push(names[i]);
        }
        emit CandidatesSet(names);
    }

    function setMerkleRoot(bytes32 root) external onlyOwner {
        if (root == bytes32(0)) revert InvalidProof();
        voterRoot = root;
        emit MerkleRootSet(root);
    }

    function setWindow(uint64 start_, uint64 end_) external onlyOwner {
        if (end_ <= start_) revert BadWindow(start_, end_);
        start = start_;
        end = end_;
        emit WindowSet(start_, end_);
    }

    // -------------------------------------------------------------------------
    // Voting
    // -------------------------------------------------------------------------
    function vote(uint256 candidateId, bytes32[] calldata proof) external nonReentrant {
        if (start == 0 && end == 0) revert WindowNotSet();
        if (block.timestamp < start || block.timestamp > end) revert VotingClosed();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId >= _candidates.length) revert InvalidCandidate(candidateId);

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, voterRoot, leaf)) revert InvalidProof();

        hasVoted[msg.sender] = true;
        voteCounts[candidateId]++;  // NEW: Increment vote count

        if (rewardAmount != 0) {
            balToken.mint(msg.sender, rewardAmount);
            emit RewardMinted(msg.sender, rewardAmount);
        }

        emit Voted(msg.sender, candidateId);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    function getCandidates() external view returns (string[] memory) {
        return _candidates;
    }

    function getCandidate(uint256 candidateId) external view returns (string memory) {
        if (candidateId >= _candidates.length) revert InvalidCandidate(candidateId);
        return _candidates[candidateId];
    }

    function candidateCount() external view returns (uint256) {
        return _candidates.length;
    }

    function getWindow() external view returns (uint64, uint64) {
        return (start, end);
    }

    // NEW: Get vote count for a candidate
    function getVotes(uint256 candidateId) external view returns (uint256) {
        if (candidateId >= _candidates.length) revert InvalidCandidate(candidateId);
        return voteCounts[candidateId];
    }

    // NEW: Get results for all candidates
    function getResults() external view returns (string[] memory candidates, uint256[] memory votes) {
        candidates = _candidates;
        votes = new uint256[](_candidates.length);
        for (uint256 i = 0; i < _candidates.length; i++) {
            votes[i] = voteCounts[i];
        }
    }
}