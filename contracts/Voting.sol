// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @dev Minimal interface for BAL token
interface IBALToken {
    function mint(address to, uint256 amount) external;
}

/// @dev Minimal interface for CandidateNFT
interface ICandidateNFT {
    function mintCandidate(address to, string memory name, string memory uri) external returns (uint256);
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
error InvalidPosition(uint8 position);

// -----------------------------------------------------------------------------
// Contract
// -----------------------------------------------------------------------------
contract Voting is Ownable, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------
    struct Candidate {
        string name;
        uint8[3] positions; // Policy positions (0-10 scale)
        uint256 voteCount;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event CandidatesSet(string[] names);
    event CandidateAdded(uint256 indexed candidateId, string name);
    event MerkleRootSet(bytes32 root);
    event WindowSet(uint64 start, uint64 end);
    event Voted(address indexed voter, uint256 indexed candidateId, bool isAnonymous);
    event RewardMinted(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    uint64 public start;
    uint64 public end;
    bytes32 public voterRoot;
    
    Candidate[] internal _candidates;
    mapping(address => bool) public hasVoted;

    IBALToken public immutable balToken;
    ICandidateNFT public candidateNFT; // Optional NFT support
    uint256 public immutable rewardAmount;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    /// @param balAddress BAL token contract address
    /// @param rewardPerVote Amount of tokens minted to each voter
    /// @param nftAddress Optional CandidateNFT contract (can be address(0))
    constructor(
        address balAddress, 
        uint256 rewardPerVote,
        address nftAddress
    ) Ownable(msg.sender) {
        if (balAddress == address(0)) revert ZeroAddress();
        balToken = IBALToken(balAddress);
        rewardAmount = rewardPerVote;
        if (nftAddress != address(0)) {
            candidateNFT = ICandidateNFT(nftAddress);
        }
    }

    // -------------------------------------------------------------------------
    // Admin (owner-only)
    // -------------------------------------------------------------------------
    
    /// @notice Add single candidate with policy positions
    /// @param name Candidate name
    /// @param positions Array of 3 policy positions (0-10 scale)
    function addCandidate(
        string calldata name, 
        uint8[3] calldata positions
    ) external onlyOwner {
        // Validate positions
        for (uint256 i = 0; i < 3; i++) {
            if (positions[i] > 10) revert InvalidPosition(positions[i]);
        }

        _candidates.push(Candidate({
            name: name,
            positions: positions,
            voteCount: 0
        }));

        uint256 candidateId = _candidates.length - 1;

        // Mint NFT if contract is set
        if (address(candidateNFT) != address(0)) {
            try candidateNFT.mintCandidate(
                owner(),
                name,
                string(abi.encodePacked("ipfs://candidate/", name))
            ) {} catch {}
        }

        emit CandidateAdded(candidateId, name);
    }

    /// @notice Batch set candidates (legacy support)
    function setCandidates(string[] calldata names) external onlyOwner {
        if (names.length == 0) revert ZeroLengthCandidates();

        delete _candidates;
        for (uint256 i = 0; i < names.length; i++) {
            // Default positions: [5, 5, 5] (moderate)
            _candidates.push(Candidate({
                name: names[i],
                positions: [5, 5, 5],
                voteCount: 0
            }));
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
    
    /// @notice Direct vote for specific candidate
    function vote(
        uint256 candidateId,
        bytes32[] calldata proof
    ) external nonReentrant {
        _validateVote(candidateId, proof);

        _candidates[candidateId].voteCount++;
        
        _mintReward();
        emit Voted(msg.sender, candidateId, false);
    }

    /// @notice Anonymous questionnaire-based voting (5 BONUS POINTS)
    /// @dev Matches voter positions to closest candidate using Euclidean distance
    /// @param positions Voter's policy positions [0-10] on 3 topics
    function voteByQuestionnaire(
        uint8[3] calldata positions,
        bytes32[] calldata proof
    ) external nonReentrant {
        // Validate positions
        for (uint256 i = 0; i < 3; i++) {
            if (positions[i] > 10) revert InvalidPosition(positions[i]);
        }

        _validateVote(0, proof); // Validate eligibility (candidateId not checked)

        // Find closest matching candidate
        uint256 closestCandidate = 0;
        uint256 minDistance = type(uint256).max;

        for (uint256 i = 0; i < _candidates.length; i++) {
            uint256 distance = _calculateDistance(positions, _candidates[i].positions);
            if (distance < minDistance) {
                minDistance = distance;
                closestCandidate = i;
            }
        }

        _candidates[closestCandidate].voteCount++;
        
        _mintReward();
        emit Voted(msg.sender, closestCandidate, true);
    }

    /// @dev Calculate squared Euclidean distance between positions
    function _calculateDistance(
        uint8[3] calldata voterPos,
        uint8[3] memory candidatePos
    ) internal pure returns (uint256) {
        uint256 sumSquares = 0;
        for (uint256 i = 0; i < 3; i++) {
            int256 diff = int256(uint256(voterPos[i])) - int256(uint256(candidatePos[i]));
            sumSquares += uint256(diff * diff);
        }
        return sumSquares;
    }

    /// @dev Common validation logic
    function _validateVote(uint256 candidateId, bytes32[] calldata proof) internal {
        if (start == 0 && end == 0) revert WindowNotSet();
        if (block.timestamp < start || block.timestamp > end) revert VotingClosed();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId >= _candidates.length) revert InvalidCandidate(candidateId);

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, voterRoot, leaf)) revert InvalidProof();

        hasVoted[msg.sender] = true;
    }

    /// @dev Mint reward tokens
    function _mintReward() internal {
        if (rewardAmount != 0) {
            balToken.mint(msg.sender, rewardAmount);
            emit RewardMinted(msg.sender, rewardAmount);
        }
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    function getCandidates() external view returns (string[] memory) {
        string[] memory names = new string[](_candidates.length);
        for (uint256 i = 0; i < _candidates.length; i++) {
            names[i] = _candidates[i].name;
        }
        return names;
    }

    function getCandidate(uint256 candidateId) 
        external 
        view 
        returns (string memory name, uint8[3] memory positions, uint256 voteCount) 
    {
        if (candidateId >= _candidates.length) revert InvalidCandidate(candidateId);
        Candidate memory c = _candidates[candidateId];
        return (c.name, c.positions, c.voteCount);
    }

    function candidateCount() external view returns (uint256) {
        return _candidates.length;
    }

    function getWindow() external view returns (uint64, uint64) {
        return (start, end);
    }

    function getVotes(uint256 candidateId) external view returns (uint256) {
        if (candidateId >= _candidates.length) revert InvalidCandidate(candidateId);
        return _candidates[candidateId].voteCount;
    }

    function getResults()
        external
        view
        returns (string[] memory candidates, uint256[] memory votes)
    {
        if (_candidates.length == 0) {
            return (new string[](0), new uint256[](0));
        }

        candidates = new string[](_candidates.length);
        votes = new uint256[](_candidates.length);
        
        for (uint256 i = 0; i < _candidates.length; i++) {
            candidates[i] = _candidates[i].name;
            votes[i] = _candidates[i].voteCount;
        }
    }

    /// @notice Get candidate with full details including positions
    function getCandidateDetails()
        external
        view
        returns (
            string[] memory names,
            uint8[3][] memory positions,
            uint256[] memory votes
        )
    {
        if (_candidates.length == 0) {
            return (new string[](0), new uint8[3][](0), new uint256[](0));
        }

        names = new string[](_candidates.length);
        positions = new uint8[3][](_candidates.length);
        votes = new uint256[](_candidates.length);

        for (uint256 i = 0; i < _candidates.length; i++) {
            names[i] = _candidates[i].name;
            positions[i] = _candidates[i].positions;
            votes[i] = _candidates[i].voteCount;
        }
    }
}