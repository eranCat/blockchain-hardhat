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
    function mint(address to, string memory uri) external returns (uint256);
}

// -----------------------------------------------------------------------------
// Custom Errors
// -----------------------------------------------------------------------------
error VotingClosed();
error VotingNotConfigured();
error AlreadyVoted();
error InvalidCandidateId(uint256 candidateId);
error InvalidMerkleProof();
error EmptyCandidateList();
error ZeroAddress();
error InvalidTimeWindow(uint64 start, uint64 end);
error InvalidPosition(uint8 position, uint8 max);

// -----------------------------------------------------------------------------
// Contract
// -----------------------------------------------------------------------------
contract Voting is Ownable, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    uint8 private constant POSITION_COUNT = 3;
    uint8 private constant MAX_POSITION_VALUE = 10;
    uint8 private constant MODERATE_POSITION = 5;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------
    struct Candidate {
        string name;
        uint8[POSITION_COUNT] positions;
        uint256 voteCount;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event CandidateSet(
        uint256 indexed candidateId,
        string name,
        uint8[POSITION_COUNT] positions
    );
    event CandidatesBatchSet(uint256 count);
    event VoterRootSet(bytes32 indexed root);
    event VotingWindowSet(uint64 startTime, uint64 endTime);
    event VoteCast(
        address indexed voter,
        uint256 indexed candidateId,
        bool isAnonymous
    );
    event RewardMinted(address indexed voter, uint256 amount);
    event NFTMintFailed(string reason);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    uint64 public votingStart;
    uint64 public votingEnd;
    bytes32 public voterRoot;

    Candidate[] private _candidates;
    mapping(address => bool) public hasVoted;

    IBALToken public immutable balToken;
    ICandidateNFT public immutable candidateNFT;
    uint256 public immutable rewardAmount;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    /// @param _balToken BAL token contract address
    /// @param _rewardAmount Amount of BAL tokens minted per vote
    /// @param _nftContract Optional CandidateNFT contract (can be address(0))
    constructor(
        address _balToken,
        uint256 _rewardAmount,
        address _nftContract
    ) Ownable(msg.sender) {
        if (_balToken == address(0)) revert ZeroAddress();

        balToken = IBALToken(_balToken);
        rewardAmount = _rewardAmount;
        candidateNFT = _nftContract != address(0)
            ? ICandidateNFT(_nftContract)
            : ICandidateNFT(address(0));
    }

    // -------------------------------------------------------------------------
    // Admin Functions
    // -------------------------------------------------------------------------

    /// @notice Set a single candidate with custom policy positions
    /// @param name Candidate name
    /// @param positions Policy positions array [0-10] on POSITION_COUNT topics
    function setCandidate(
        string calldata name,
        uint8[POSITION_COUNT] calldata positions
    ) external onlyOwner {
        uint8[POSITION_COUNT] memory pos = positions;
        _setCandidate(name, pos);
    }

    /// @notice Batch set candidates with moderate default positions
    /// @dev Clears existing candidates and adds new ones with [5,5,5] positions
    /// @param names Array of candidate names
    function setCandidates(string[] calldata names) external onlyOwner {
        if (names.length == 0) revert EmptyCandidateList();

        delete _candidates;

        uint8[POSITION_COUNT] memory moderatePositions;
        for (uint256 i = 0; i < POSITION_COUNT; i++) {
            moderatePositions[i] = MODERATE_POSITION;
        }

        for (uint256 i = 0; i < names.length; i++) {
            _setCandidate(names[i], moderatePositions);
        }

        emit CandidatesBatchSet(names.length);
    }

    /// @notice Set Merkle root for voter eligibility verification
    /// @param root Merkle tree root hash
    function setVoterRoot(bytes32 root) external onlyOwner {
        if (root == bytes32(0)) revert InvalidMerkleProof();
        voterRoot = root;
        emit VoterRootSet(root);
    }

    /// @notice Configure voting time window
    /// @param _start Unix timestamp for voting start
    /// @param _end Unix timestamp for voting end
    function setVotingWindow(uint64 _start, uint64 _end) external onlyOwner {
        if (_end <= _start) revert InvalidTimeWindow(_start, _end);
        votingStart = _start;
        votingEnd = _end;
        emit VotingWindowSet(_start, _end);
    }

    // -------------------------------------------------------------------------
    // Voting Functions
    // -------------------------------------------------------------------------

    /// @notice Cast direct vote for specific candidate
    /// @param candidateId Index of candidate to vote for
    /// @param merkleProof Merkle proof of voter eligibility
    function vote(
        uint256 candidateId,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        _validateVote(candidateId, merkleProof);

        _candidates[candidateId].voteCount++;
        _distributeReward();

        emit VoteCast(msg.sender, candidateId, false);
    }

    /// @notice Cast anonymous vote via questionnaire matching (5 BONUS POINTS)
    /// @dev Matches voter positions to closest candidate using squared Euclidean distance
    /// @param positions Voter's policy positions [0-10] on POSITION_COUNT topics
    /// @param merkleProof Merkle proof of voter eligibility
    function voteByQuestionnaire(
        uint8[POSITION_COUNT] calldata positions,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        // Convert calldata to memory for validation
        uint8[POSITION_COUNT] memory pos = positions;
        _validatePositions(pos);

        _validateVote(0, merkleProof);

        uint256 closestCandidateId = _findClosestCandidate(positions);

        _candidates[closestCandidateId].voteCount++;
        _distributeReward();

        emit VoteCast(msg.sender, closestCandidateId, true);
    }

    // -------------------------------------------------------------------------
    // Internal Helper Functions
    // -------------------------------------------------------------------------

    /// @dev Internal function to add a candidate
    function _setCandidate(
        string memory name,
        uint8[POSITION_COUNT] memory positions
    ) internal {
        _validatePositions(positions);

        uint256 candidateId = _candidates.length;

        _candidates.push(
            Candidate({name: name, positions: positions, voteCount: 0})
        );

        // Mint NFT if contract is configured
        _mintCandidateNFT(name);

        emit CandidateSet(candidateId, name, positions);
    }

    /// @dev Validate position values are within allowed range
    function _validatePositions(
        uint8[POSITION_COUNT] memory positions
    ) internal pure {
        for (uint256 i = 0; i < POSITION_COUNT; i++) {
            if (positions[i] > MAX_POSITION_VALUE) {
                revert InvalidPosition(positions[i], MAX_POSITION_VALUE);
            }
        }
    }

    /// @dev Common validation for all vote types
    function _validateVote(
        uint256 candidateId,
        bytes32[] calldata merkleProof
    ) internal {
        if (votingStart == 0 || votingEnd == 0) revert VotingNotConfigured();
        if (block.timestamp < votingStart || block.timestamp > votingEnd)
            revert VotingClosed();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId >= _candidates.length)
            revert InvalidCandidateId(candidateId);

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(merkleProof, voterRoot, leaf))
            revert InvalidMerkleProof();

        hasVoted[msg.sender] = true;
    }

    /// @dev Find candidate with minimum distance to voter positions
    function _findClosestCandidate(
        uint8[POSITION_COUNT] calldata voterPositions
    ) internal view returns (uint256) {
        uint256 closestId = 0;
        uint256 minDistance = type(uint256).max;

        for (uint256 i = 0; i < _candidates.length; i++) {
            uint256 distance = _calculateSquaredDistance(
                voterPositions,
                _candidates[i].positions
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestId = i;
            }
        }

        return closestId;
    }

    /// @dev Calculate squared Euclidean distance (sqrt not needed for comparison)
    function _calculateSquaredDistance(
        uint8[POSITION_COUNT] calldata voterPos,
        uint8[POSITION_COUNT] memory candidatePos
    ) internal pure returns (uint256) {
        uint256 sumSquares = 0;

        for (uint256 i = 0; i < POSITION_COUNT; i++) {
            int256 diff = int256(uint256(voterPos[i])) -
                int256(uint256(candidatePos[i]));
            sumSquares += uint256(diff * diff);
        }

        return sumSquares;
    }

    /// @dev Mint BAL token rewards to voter
    function _distributeReward() internal {
        if (rewardAmount > 0) {
            balToken.mint(msg.sender, rewardAmount);
            emit RewardMinted(msg.sender, rewardAmount);
        }
    }

    /// @dev Attempt to mint candidate NFT (fail gracefully)
    function _mintCandidateNFT(string memory name) internal {
        if (address(candidateNFT) != address(0)) {
            try
                candidateNFT.mint(
                    owner(),
                    string(abi.encodePacked("ipfs://candidate/", name))
                )
            {
                // Success - no action needed
            } catch Error(string memory reason) {
                emit NFTMintFailed(reason);
            } catch {
                emit NFTMintFailed("Unknown error");
            }
        }
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /// @notice Get total number of candidates
    function candidateCount() external view returns (uint256) {
        return _candidates.length;
    }

    /// @notice Get voting time window
    function getVotingWindow()
        external
        view
        returns (uint64 start, uint64 end)
    {
        return (votingStart, votingEnd);
    }

    /// @notice Get candidate names only (lightweight)
    function getCandidateNames() external view returns (string[] memory) {
        string[] memory names = new string[](_candidates.length);
        for (uint256 i = 0; i < _candidates.length; i++) {
            names[i] = _candidates[i].name;
        }
        return names;
    }

    /// @notice Get single candidate details
    function getCandidate(
        uint256 candidateId
    )
        external
        view
        returns (
            string memory name,
            uint8[POSITION_COUNT] memory positions,
            uint256 voteCount
        )
    {
        if (candidateId >= _candidates.length)
            revert InvalidCandidateId(candidateId);
        Candidate memory c = _candidates[candidateId];
        return (c.name, c.positions, c.voteCount);
    }

    /// @notice Get all candidates with full details (gas-intensive)
    function getAllCandidates()
        external
        view
        returns (
            string[] memory names,
            uint8[POSITION_COUNT][] memory positions,
            uint256[] memory votes
        )
    {
        uint256 length = _candidates.length;

        names = new string[](length);
        positions = new uint8[POSITION_COUNT][](length);
        votes = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            Candidate memory c = _candidates[i]; // Cache in memory
            names[i] = c.name;
            positions[i] = c.positions;
            votes[i] = c.voteCount;
        }
    }

    /// @notice Get election results (sorted by vote count, descending)
    function getResults()
        external
        view
        returns (string[] memory names, uint256[] memory votes)
    {
        uint256 length = _candidates.length;
        if (length == 0) {
            return (new string[](0), new uint256[](0));
        }

        // Create arrays
        names = new string[](length);
        votes = new uint256[](length);

        // Copy data (cache in memory for gas efficiency)
        for (uint256 i = 0; i < length; i++) {
            Candidate memory c = _candidates[i];
            names[i] = c.name;
            votes[i] = c.voteCount;
        }

        // Bubble sort (descending) - acceptable for small candidate lists
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (votes[j] < votes[j + 1]) {
                    // Swap votes
                    (votes[j], votes[j + 1]) = (votes[j + 1], votes[j]);
                    // Swap names
                    (names[j], names[j + 1]) = (names[j + 1], names[j]);
                }
            }
        }
    }

    /// @notice Get election winner (requires votes to be cast)
    function getWinner() external view returns (string memory) {
        if (_candidates.length == 0) revert EmptyCandidateList();

        uint256 maxVotes = 0;
        uint256 winnerId = 0;

        for (uint256 i = 0; i < _candidates.length; i++) {
            if (_candidates[i].voteCount > maxVotes) {
                maxVotes = _candidates[i].voteCount;
                winnerId = i;
            }
        }

        return _candidates[winnerId].name;
    }
}
