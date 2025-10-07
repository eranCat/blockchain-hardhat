// contracts/Voting.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IBALToken {
    function mint(address to, uint256 amount) external;
}

contract Voting is Ownable, ReentrancyGuard {
    struct Candidate {
        string name;
        uint8[3] positions;
        uint256 voteCount;
    }

    event ElectionStarted(uint256 indexed id, uint64 start, uint64 end);
    event ElectionEnded(uint256 indexed id, string winner);
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 indexed electionId);

    error VotingClosed();
    error AlreadyVoted();
    error InvalidCandidateId();
    error InvalidWindow();
    error InvalidPositions();
    error NotWhitelisted();

    Candidate[] private _candidates;
    bytes32 public voterRoot;

    uint64 public votingStart;
    uint64 public votingEnd;

    uint256 private _electionId;
    string public lastWinner;

    mapping(uint256 => mapping(address => bool)) private _voted;

    address public immutable balToken;
    uint256 public immutable rewardPerVote;

    constructor(address balTokenAddress, uint256 rewardAmount) Ownable(msg.sender) {
        balToken = balTokenAddress;
        rewardPerVote = rewardAmount;
    }

    function currentElectionId() public view returns (uint256) {
        return _electionId;
    }

    function setCandidate(string calldata name, uint8[3] calldata positions) external onlyOwner {
        if (positions[0] > 10 || positions[1] > 10 || positions[2] > 10) revert InvalidPositions();
        _candidates.push(Candidate({name: name, positions: positions, voteCount: 0}));
    }

    function setCandidates(string[] calldata names, uint8[3][] calldata positionsArr) external onlyOwner {
        require(names.length == positionsArr.length, "Length mismatch");
        for (uint256 i = 0; i < names.length; i++) {
            if (positionsArr[i][0] > 10 || positionsArr[i][1] > 10 || positionsArr[i][2] > 10) revert InvalidPositions();
            _candidates.push(Candidate({name: names[i], positions: positionsArr[i], voteCount: 0}));
        }
    }

    function setVoterRoot(bytes32 root) external onlyOwner {
        voterRoot = root;
    }

    function setVotingWindow(uint64 start, uint64 end) external onlyOwner {
        if (start >= end) revert InvalidWindow();
        bool newRound = block.timestamp < start || _electionId == 0;
        votingStart = start;
        votingEnd = end;
        if (newRound) {
            unchecked {
                _electionId++;
            }
            lastWinner = "";
            emit ElectionStarted(_electionId, start, end);
        }
    }

    function endElection() external onlyOwner {
        if (block.timestamp <= votingEnd) revert VotingClosed();
        (string memory name, ) = _computeWinner();
        lastWinner = name;
        emit ElectionEnded(_electionId, name);
    }

    function vote(uint256 candidateId, bytes32[] calldata merkleProof) external nonReentrant {
        if (!_isOpen()) revert VotingClosed();
        uint256 eid = _electionId;
        if (_voted[eid][msg.sender]) revert AlreadyVoted();
        if (candidateId >= _candidates.length) revert InvalidCandidateId();
        if (!_isWhitelisted(msg.sender, merkleProof)) revert NotWhitelisted();
        _candidates[candidateId].voteCount += 1;
        _voted[eid][msg.sender] = true;
        emit VoteCast(msg.sender, candidateId, eid);
        _reward(msg.sender);
    }

    function voteByQuestionnaire(uint8[3] calldata positions, bytes32[] calldata merkleProof) external nonReentrant {
        if (!_isOpen()) revert VotingClosed();
        uint256 eid = _electionId;
        if (_voted[eid][msg.sender]) revert AlreadyVoted();
        if (!_isWhitelisted(msg.sender, merkleProof)) revert NotWhitelisted();
        uint256 picked = _closestCandidate(positions);
        _candidates[picked].voteCount += 1;
        _voted[eid][msg.sender] = true;
        emit VoteCast(msg.sender, picked, eid);
        _reward(msg.sender);
    }

    function getVotingWindow() external view returns (uint64 start, uint64 end) {
        return (votingStart, votingEnd);
    }

    function candidateCount() external view returns (uint256) {
        return _candidates.length;
    }

    function getAllCandidates()
        external
        view
        returns (string[] memory names, uint8[3][] memory positions, uint256[] memory votes)
    {
        uint256 n = _candidates.length;
        names = new string[](n);
        positions = new uint8[3][](n);
        votes = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            Candidate storage c = _candidates[i];
            names[i] = c.name;
            positions[i] = c.positions;
            votes[i] = c.voteCount;
        }
    }

    function getResults() external view returns (string[] memory names, uint256[] memory votes) {
        uint256 n = _candidates.length;
        names = new string[](n);
        votes = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            names[i] = _candidates[i].name;
            votes[i] = _candidates[i].voteCount;
        }
    }

    function getWinner() external view returns (string memory) {
        if (bytes(lastWinner).length != 0) return lastWinner;
        (string memory name, ) = _computeWinner();
        return name;
    }

    function hasVoted(address voter) external view returns (bool) {
        return _voted[_electionId][voter];
    }

    function _isOpen() private view returns (bool) {
        return block.timestamp >= votingStart && block.timestamp <= votingEnd && _electionId != 0;
    }

    function _isWhitelisted(address who, bytes32[] calldata proof) private view returns (bool) {
        if (voterRoot == bytes32(0)) return false;
        bytes32 leaf = keccak256(abi.encodePacked(who));
        return MerkleProof.verify(proof, voterRoot, leaf);
    }

    function _closestCandidate(uint8[3] calldata p) private view returns (uint256) {
        uint256 n = _candidates.length;
        require(n > 0, "No candidates");
        uint256 bestIdx = 0;
        uint256 bestScore = type(uint256).max;
        for (uint256 i = 0; i < n; i++) {
            uint8[3] storage q = _candidates[i].positions;
            uint256 d0 = uint256(int256(uint256(p[0])) > int256(uint256(q[0])) ? p[0] - q[0] : q[0] - p[0]);
            uint256 d1 = uint256(int256(uint256(p[1])) > int256(uint256(q[1])) ? p[1] - q[1] : q[1] - p[1]);
            uint256 d2 = uint256(int256(uint256(p[2])) > int256(uint256(q[2])) ? p[2] - q[2] : q[2] - p[2]);
            uint256 score = d0 * d0 + d1 * d1 + d2 * d2;
            if (score < bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        return bestIdx;
    }

    function _computeWinner() private view returns (string memory name, uint256 votes) {
        uint256 n = _candidates.length;
        if (n == 0) return ("", 0);
        uint256 bestIdx = 0;
        uint256 bestVotes = _candidates[0].voteCount;
        for (uint256 i = 1; i < n; i++) {
            if (_candidates[i].voteCount > bestVotes) {
                bestVotes = _candidates[i].voteCount;
                bestIdx = i;
            }
        }
        return (_candidates[bestIdx].name, bestVotes);
    }

    function _reward(address to) private {
        if (balToken != address(0) && rewardPerVote > 0) {
            try IBALToken(balToken).mint(to, rewardPerVote) { } catch { }
        }
    }
}
