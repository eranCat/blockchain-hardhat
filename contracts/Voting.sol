// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Voting is Ownable {
    struct Candidate {
        string name;
        uint256 votes;
        int8[3] positions;
    }

    bytes32 public voterRoot;
    uint256 public startTime;
    uint256 public endTime;

    // election lifecycle
    uint256 public currentElectionId;
    mapping(address => uint256) public lastVotedElection; // resets “has voted” per election

    Candidate[] private _candidates;

    event CandidatesSet(uint256 indexed electionId, uint256 count);
    event WindowSet(uint256 indexed electionId, uint256 start, uint256 end);
    event VoterRootSet(uint256 indexed electionId, bytes32 root);
    event Voted(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function candidatesCount() external view returns (uint256) { return _candidates.length; }

    function getAllCandidates()
        external
        view
        returns (string[] memory names, int8[3][] memory positions, uint256[] memory votes)
    {
        uint256 n = _candidates.length;
        names = new string[](n);
        positions = new int8[3][](n);
        votes = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            Candidate storage c = _candidates[i];
            names[i] = c.name;
            positions[i] = c.positions;
            votes[i] = c.votes;
        }
    }

    // replace candidates for the current election
    function setCandidates(string[] calldata names, int8[3][] calldata positions) external onlyOwner {
        require(names.length > 0 && names.length == positions.length, "Bad lengths");
        delete _candidates; // <-- replace, do not append
        for (uint256 i; i < names.length; ++i) {
            _candidates.push(Candidate({ name: names[i], votes: 0, positions: positions[i] }));
        }
        emit CandidatesSet(currentElectionId, names.length);
    }

    function setWindow(uint256 start_, uint256 end_) external onlyOwner {
        require(end_ > start_, "Bad window");
        startTime = start_;
        endTime = end_;
        emit WindowSet(currentElectionId, start_, end_);
    }

    function setVoterRoot(bytes32 root) external onlyOwner {
        voterRoot = root;
        emit VoterRootSet(currentElectionId, root);
    }

    // start a fresh election: bumps id and clears old votes/candidates
    function startNewElection(uint256 start_, uint256 end_, string[] calldata names, int8[3][] calldata positions, bytes32 root)
        external
        onlyOwner
    {
        require(end_ > start_, "Bad window");
        unchecked { ++currentElectionId; }
        startTime = start_;
        endTime = end_;
        voterRoot = root;
        delete _candidates;
        for (uint256 i; i < names.length; ++i) {
            _candidates.push(Candidate({ name: names[i], votes: 0, positions: positions[i] }));
        }
        emit WindowSet(currentElectionId, start_, end_);
        emit CandidatesSet(currentElectionId, names.length);
        emit VoterRootSet(currentElectionId, root);
    }

    function isActive() public view returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime && _candidates.length > 0;
    }

    // StandardMerkleTree leaf for ["address"] is double-hash of abi.encode(address)
    function _stdLeaf(address a) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(a))));
    }

    function vote(uint256 candidateId, bytes32[] calldata proof) external {
        require(isActive(), "Voting closed");
        require(candidateId < _candidates.length, "Bad candidate");
        require(lastVotedElection[msg.sender] != currentElectionId, "Already voted");

        bool ok = MerkleProof.verify(proof, voterRoot, _stdLeaf(msg.sender));
        require(ok, "Invalid Merkle proof");

        _candidates[candidateId].votes += 1;
        lastVotedElection[msg.sender] = currentElectionId;

        emit Voted(currentElectionId, msg.sender, candidateId);
    }
}
