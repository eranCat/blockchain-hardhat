// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IBALToken {
    function mint(address to, uint256 amount) external;
}

error VotingClosed();
error VotingNotConfigured();
error AlreadyVoted();
error InvalidCandidateId(uint256 candidateId);
error InvalidMerkleProof();
error EmptyCandidateList();
error ZeroAddress();
error InvalidTimeWindow(uint64 start, uint64 end);
error InvalidPosition(uint8 position, uint8 max);

contract Voting is Ownable, ReentrancyGuard {
    uint8 private constant POSITION_COUNT = 3;
    uint8 private constant MAX_POSITION_VALUE = 10;

    struct Candidate {
        string name;
        uint8[POSITION_COUNT] positions;
        uint256 voteCount;
    }

    event CandidatesSet(uint256 count);
    event VoterRootSet(bytes32 indexed root);
    event VotingWindowSet(uint64 startTime, uint64 endTime);
    event VoteCast(address indexed voter, uint256 indexed candidateId, bool isAnonymous);
    event RewardMinted(address indexed voter, uint256 amount);

    uint64 public votingStart;
    uint64 public votingEnd;
    bytes32 public voterRoot;

    Candidate[] private _candidates;
    mapping(address => bool) public hasVoted;

    IBALToken public immutable balToken;
    uint256 public immutable rewardAmount;

    constructor(address _balToken, uint256 _rewardAmount) Ownable(msg.sender) {
        if (_balToken == address(0)) revert ZeroAddress();
        balToken = IBALToken(_balToken);
        rewardAmount = _rewardAmount;
    }

    /// @notice Set all candidates with positions (clears existing)
    function setCandidates(
        string[] calldata names,
        uint8[POSITION_COUNT][] calldata positions
    ) external onlyOwner {
        if (names.length == 0) revert EmptyCandidateList();
        if (names.length != positions.length) revert EmptyCandidateList();

        delete _candidates;

        for (uint256 i = 0; i < names.length; i++) {
            _validatePositions(positions[i]);
            _candidates.push(Candidate({
                name: names[i],
                positions: positions[i],
                voteCount: 0
            }));
        }

        emit CandidatesSet(names.length);
    }

    function setVoterRoot(bytes32 root) external onlyOwner {
        if (root == bytes32(0)) revert InvalidMerkleProof();
        voterRoot = root;
        emit VoterRootSet(root);
    }

    function setVotingWindow(uint64 _start, uint64 _end) external onlyOwner {
        if (_end <= _start) revert InvalidTimeWindow(_start, _end);
        votingStart = _start;
        votingEnd = _end;
        emit VotingWindowSet(_start, _end);
    }

    /// @notice Direct vote
    function vote(uint256 candidateId, bytes32[] calldata merkleProof) external nonReentrant {
        _validateVote(candidateId, merkleProof);
        _candidates[candidateId].voteCount++;
        _distributeReward();
        emit VoteCast(msg.sender, candidateId, false);
    }

    /// @notice Anonymous vote by questionnaire (5 BONUS POINTS)
    function voteByQuestionnaire(
        uint8[POSITION_COUNT] calldata positions,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        _validatePositions(positions);
        _validateVote(0, merkleProof);

        uint256 closestId = _findClosestCandidate(positions);
        _candidates[closestId].voteCount++;
        _distributeReward();

        emit VoteCast(msg.sender, closestId, true);
    }

    function _validatePositions(uint8[POSITION_COUNT] memory positions) internal pure {
        for (uint256 i = 0; i < POSITION_COUNT; i++) {
            if (positions[i] > MAX_POSITION_VALUE) {
                revert InvalidPosition(positions[i], MAX_POSITION_VALUE);
            }
        }
    }

    function _validateVote(uint256 candidateId, bytes32[] calldata merkleProof) internal {
        if (votingStart == 0 || votingEnd == 0) revert VotingNotConfigured();
        if (block.timestamp < votingStart || block.timestamp > votingEnd) revert VotingClosed();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId >= _candidates.length) revert InvalidCandidateId(candidateId);

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
        if (!MerkleProof.verify(merkleProof, voterRoot, leaf)) revert InvalidMerkleProof();

        hasVoted[msg.sender] = true;
    }

    function _findClosestCandidate(uint8[POSITION_COUNT] calldata voterPos) internal view returns (uint256) {
        uint256 closestId = 0;
        uint256 minDistance = type(uint256).max;

        for (uint256 i = 0; i < _candidates.length; i++) {
            uint256 distance = 0;
            for (uint256 j = 0; j < POSITION_COUNT; j++) {
                int256 diff = int256(uint256(voterPos[j])) - int256(uint256(_candidates[i].positions[j]));
                distance += uint256(diff * diff);
            }
            if (distance < minDistance) {
                minDistance = distance;
                closestId = i;
            }
        }

        return closestId;
    }

    function _distributeReward() internal {
        if (rewardAmount > 0) {
            balToken.mint(msg.sender, rewardAmount);
            emit RewardMinted(msg.sender, rewardAmount);
        }
    }

    function candidateCount() external view returns (uint256) {
        return _candidates.length;
    }

    function getVotingWindow() external view returns (uint64 start, uint64 end) {
        return (votingStart, votingEnd);
    }

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
            names[i] = _candidates[i].name;
            positions[i] = _candidates[i].positions;
            votes[i] = _candidates[i].voteCount;
        }
    }

    function getResults() external view returns (string[] memory names, uint256[] memory votes) {
        uint256 length = _candidates.length;
        if (length == 0) return (new string[](0), new uint256[](0));

        names = new string[](length);
        votes = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            names[i] = _candidates[i].name;
            votes[i] = _candidates[i].voteCount;
        }

        // Bubble sort descending
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (votes[j] < votes[j + 1]) {
                    (votes[j], votes[j + 1]) = (votes[j + 1], votes[j]);
                    (names[j], names[j + 1]) = (names[j + 1], names[j]);
                }
            }
        }
    }

    function getWinner() external view returns (string memory) {
        if (_candidates.length == 0) revert EmptyCandidateList();

        uint256 winnerId = 0;
        uint256 maxVotes = 0;

        for (uint256 i = 0; i < _candidates.length; i++) {
            if (_candidates[i].voteCount > maxVotes) {
                maxVotes = _candidates[i].voteCount;
                winnerId = i;
            }
        }

        return _candidates[winnerId].name;
    }
}