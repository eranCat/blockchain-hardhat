// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
  Voting.sol
  - Backwards-compatible to existing frontend/tests: keeps public names and signatures.
  - Session-based reset: votingSession + lastVotedSession (cheap, scalable).
  - startNewElection(...) increments session so previous voters can vote again.
  - getAllCandidates(), getCandidate(), getCandidatesCount()/candidateCountView(), hasVoted(), getVotingWindow(), getVoterMerkleRoot() kept for compatibility.
  - Uses OpenZeppelin Ownable (call Ownable(msg.sender) in constructor to satisfy OZ v5).
*/

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IBALToken {
    function mint(address to, uint256 amount) external;
}

contract Voting is Ownable {
    using MerkleProof for bytes32[];

    /* ========== EVENTS ========== */
    event CandidateAdded(uint256 indexed id, string name);
    event ElectionStarted(uint256 indexed session, uint64 start, uint64 end, bytes32 merkleRoot);
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 session);
    event RewardPerVoteSet(uint256 reward);

    /* ========== ERRORS ========== */
    error VotingClosed();
    error InvalidCandidate();
    error AlreadyVoted();
    error NotWhitelisted();
    error InvalidWindow();

    /* ========== STRUCTS ========== */
    struct Candidate {
        string name;
        uint8[3] positions;
        uint256 votes;
        bool exists;
    }

    /* ========== STATE (names preserved for ABI compatibility) ========== */

    // public mapping and public count: keep getters identical to older ABI
    mapping(uint256 => Candidate) public candidates;
    uint256 public candidateCount;

    // voting window
    uint64 public votingStart;
    uint64 public votingEnd;

    // session-based reset
    uint256 public votingSession;
    mapping(address => uint256) public lastVotedSession;

    // merkle root for whitelist (0 => open)
    bytes32 public voterMerkleRoot;

    // BAL token reward
    IBALToken public immutable balToken;
    uint256 public rewardPerVote;

    /* ========== CONSTRUCTOR ==========
       Call Ownable(msg.sender) to satisfy OpenZeppelin v5 Ownable constructor
    */
    constructor(address _balToken, uint256 _rewardPerVote) Ownable(msg.sender) {
        require(_balToken != address(0), "BAL token addr zero");
        balToken = IBALToken(_balToken);
        rewardPerVote = _rewardPerVote;
    }

    /* ========== ADMIN ========== */

    /// @notice Start a new election (resets votingSession so previous voters can vote again)
    /// @param _start unix timestamp start
    /// @param _end unix timestamp end
    /// @param _names candidate names
    /// @param _positions candidate 3-number position vectors
    /// @param _voterMerkleRoot merkle root for whitelist (0x0 = open)
    function startNewElection(
        uint64 _start,
        uint64 _end,
        string[] calldata _names,
        uint8[3][] calldata _positions,
        bytes32 _voterMerkleRoot
    ) external onlyOwner {
        if (_end <= _start) revert InvalidWindow();
        if (_names.length == 0) revert InvalidCandidate();
        if (_positions.length != _names.length) revert InvalidCandidate();

        // increment session to "reset" who can vote (cheap)
        unchecked { votingSession++; }

        // clear old candidates (delete mapping entries)
        for (uint256 i = 0; i < candidateCount; i++) {
            delete candidates[i];
        }
        candidateCount = 0;

        // add new candidates
        for (uint256 i = 0; i < _names.length; i++) {
            candidates[candidateCount] = Candidate({
                name: _names[i],
                positions: _positions[i],
                votes: 0,
                exists: true
            });
            emit CandidateAdded(candidateCount, _names[i]);
            candidateCount++;
        }

        // set window & merkle
        votingStart = _start;
        votingEnd = _end;
        voterMerkleRoot = _voterMerkleRoot;

        emit ElectionStarted(votingSession, _start, _end, _voterMerkleRoot);
    }

    /// @notice Set reward per vote (same name as previous)
    function setRewardPerVote(uint256 _reward) external onlyOwner {
        rewardPerVote = _reward;
        emit RewardPerVoteSet(_reward);
    }

    /// @notice Manually bump session (owner-only) — keeps same name/signature
    function bumpSession() external onlyOwner {
        unchecked { votingSession++; }
        emit ElectionStarted(votingSession, votingStart, votingEnd, voterMerkleRoot);
    }

    /// @notice Update merkle root (owner)
    function setRoot(bytes32 _root) external onlyOwner {
        voterMerkleRoot = _root;
    }

    function setWindow(uint64 _start, uint64 _end) external onlyOwner {
        votingStart = _start;
        votingEnd = _end;
    }

    /* ========== VOTING ========== */

    /// @notice Vote for a candidate (direct vote). Signature and name preserved.
    /// @param candidateId candidate index
    /// @param merkleProof proof if whitelist enabled (otherwise pass empty)
    function vote(uint256 candidateId, bytes32[] calldata merkleProof) external {
        uint256 nowTs = block.timestamp;
        if (nowTs < votingStart || nowTs > votingEnd) revert VotingClosed();
        if (!candidates[candidateId].exists) revert InvalidCandidate();

        if (voterMerkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            if (!merkleProof.verify(voterMerkleRoot, leaf)) revert NotWhitelisted();
        }

        if (lastVotedSession[msg.sender] == votingSession) revert AlreadyVoted();

        lastVotedSession[msg.sender] = votingSession;
        candidates[candidateId].votes += 1;

        if (rewardPerVote > 0) {
            balToken.mint(msg.sender, rewardPerVote);
        }

        emit VoteCast(msg.sender, candidateId, votingSession);
    }

    /// @notice Questionnaire-based vote: provide a 3-element positions array; contract finds the closest candidate
    /// @param voterPositions 3-values in same scale as candidate positions
    /// @param merkleProof merkle proof if whitelist enabled
    function voteByQuestionnaire(uint8[3] calldata voterPositions, bytes32[] calldata merkleProof) external {
        uint256 nowTs = block.timestamp;
        if (nowTs < votingStart || nowTs > votingEnd) revert VotingClosed();

        if (voterMerkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            if (!merkleProof.verify(voterMerkleRoot, leaf)) revert NotWhitelisted();
        }

        if (lastVotedSession[msg.sender] == votingSession) revert AlreadyVoted();

        uint256 bestId = type(uint256).max;
        uint256 bestDistSq = type(uint256).max;

        for (uint256 i = 0; i < candidateCount; i++) {
            Candidate storage c = candidates[i];
            unchecked {
                uint256 dx = c.positions[0] > voterPositions[0] ? c.positions[0] - voterPositions[0] : voterPositions[0] - c.positions[0];
                uint256 dy = c.positions[1] > voterPositions[1] ? c.positions[1] - voterPositions[1] : voterPositions[1] - c.positions[1];
                uint256 dz = c.positions[2] > voterPositions[2] ? c.positions[2] - voterPositions[2] : voterPositions[2] - c.positions[2];
                uint256 distSq = dx * dx + dy * dy + dz * dz;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    bestId = i;
                }
            }
        }

        require(bestId != type(uint256).max, "No candidates");
        lastVotedSession[msg.sender] = votingSession;
        candidates[bestId].votes += 1;

        if (rewardPerVote > 0) {
            balToken.mint(msg.sender, rewardPerVote);
        }

        emit VoteCast(msg.sender, bestId, votingSession);
    }

    /* ========== VIEWS (compatibility helpers) ========== */

    /// @notice Return number of candidates (compatibility)
    function getCandidatesCount() external view returns (uint256) {
        return candidateCount;
    }

    /// @notice Alias kept for older callers
    function candidateCountView() external view returns (uint256) {
        return candidateCount;
    }

    /// @notice Return candidate details (alias)
    function getCandidate(uint256 id) external view returns (string memory name, uint8[3] memory positions, uint256 votes, bool exists) {
        Candidate memory c = candidates[id];
        return (c.name, c.positions, c.votes, c.exists);
    }

    /// @notice Return all candidates as parallel arrays for easier frontend consumption
    function getAllCandidates() external view returns (
        string[] memory names,
        uint8[3][] memory positions,
        uint256[] memory votes,
        bool[] memory exists
    ) {
        uint256 n = candidateCount;
        names = new string[](n);
        positions = new uint8[3][](n);
        votes = new uint256[](n);
        exists = new bool[](n);

        for (uint256 i = 0; i < n; i++) {
            Candidate storage c = candidates[i];
            names[i] = c.name;
            positions[i] = c.positions;
            votes[i] = c.votes;
            exists[i] = c.exists;
        }
    }

    /// @notice Whether `account` has voted in the current session
    function hasVoted(address account) external view returns (bool) {
        return lastVotedSession[account] == votingSession;
    }

    /// @notice Return voting window
    function getVotingWindow() external view returns (uint64, uint64) {
        return (votingStart, votingEnd);
    }

    /// @notice Return merkle root
    function getVoterMerkleRoot() external view returns (bytes32) {
        return voterMerkleRoot;
    }
}
