// contracts/Voting.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/* --- Minimal external interfaces --- */
interface IBALToken {
    function mint(address to, uint256 amount) external;
}

interface ICandidateNFT {
    function mintTo(address to, string calldata uri) external returns (uint256);
}

/**
 * @title Voting
 * @notice Merkle-gated, time-bounded election with ERC20 rewards and NFT-backed candidates.
 * - Admin sets candidates (mints NFTs), voter root, and election window.
 * - Voters can vote directly or via questionnaire (closest candidate by Euclidean distance).
 * - 1 vote per election session (tracked by currentElectionId).
 */
contract Voting is Ownable, ReentrancyGuard {
    /* ------------------------------- Types ------------------------------- */
    struct Candidate {
        string name;
        uint256 votes;
        uint8[3] positions; // [economics, social, foreign] 0..10
    }

    /* ------------------------------ Storage ----------------------------- */
    Candidate[] private _candidates;
    uint256[] private _candidateTokenIds;
    string[]  private _candidateTokenUris;

    uint64 public startTime;
    uint64 public endTime;

    uint256 public currentElectionId;
    mapping(address => uint256) public lastVotedElection;

    bytes32 public voterRoot;

    IBALToken public immutable balToken;
    ICandidateNFT public candidateNft;
    uint256 public rewardPerVote;

    /* ------------------------------- Events ----------------------------- */
    event CandidateAdded(uint256 indexed id, string name, uint256 tokenId, string uri);
    event CandidatesCleared(uint256 prevCount);
    event ElectionStarted(uint256 indexed electionId, uint64 startTs, uint64 endTs);
    event VoterRootUpdated(bytes32 root);
    event RewardPerVoteUpdated(uint256 amount);
    event CandidateNFTContractUpdated(address nft);
    event Voted(address indexed voter, uint256 indexed electionId, uint256 indexed candidateId);

    /* -------------------------------- Errors ---------------------------- */
    error VotingClosed();
    error AlreadyVoted();
    error InvalidWindow();
    error InvalidCandidateId();
    error NotEligible();

    /* ---------------------------- Constructor --------------------------- */
    constructor(address balToken_, address candidateNft_, uint256 rewardPerVote_) Ownable(msg.sender) {
        require(balToken_ != address(0) && candidateNft_ != address(0), "addr=0");
        balToken = IBALToken(balToken_);
        candidateNft = ICandidateNFT(candidateNft_);
        rewardPerVote = rewardPerVote_;
    }

    /* ----------------------------- Modifiers ---------------------------- */
    modifier onlyActive() {
        if (!_isActive()) revert VotingClosed();
        _;
    }

    /* ----------------------------- Admin API ---------------------------- */

    /// Set/replace NFT contract if redeployed.
    function setCandidateNft(address nft) external onlyOwner {
        require(nft != address(0), "nft=0");
        candidateNft = ICandidateNFT(nft);
        emit CandidateNFTContractUpdated(nft);
    }

    /// Replace all candidates and mint their NFTs atomically.
    function setCandidatesWithNFT(
        string[] calldata names,
        uint8[3][] calldata positions,
        string[] calldata uris,
        address[] calldata receivers
    ) external onlyOwner {
        uint256 len = names.length;
        require(len > 0, "no candidates");
        require(len == positions.length && len == uris.length && len == receivers.length, "bad lengths");

        uint256 prev = _candidates.length;
        if (prev > 0) {
            delete _candidates;
            delete _candidateTokenIds;
            delete _candidateTokenUris;
            emit CandidatesCleared(prev);
        }

        for (uint256 i; i < len; ++i) {
            _candidates.push(Candidate({
                name: names[i],
                votes: 0,
                positions: positions[i]
            }));
            uint256 tokenId = candidateNft.mintTo(receivers[i], uris[i]);
            _candidateTokenIds.push(tokenId);
            _candidateTokenUris.push(uris[i]);
            emit CandidateAdded(i, names[i], tokenId, uris[i]);
        }
    }

    /// Start a new election window; resets tallies and bumps session id.
    function startElection(uint64 startTs, uint64 endTs) external onlyOwner {
        if (startTs >= endTs) revert InvalidWindow();

        unchecked { currentElectionId += 1; }

        for (uint256 i; i < _candidates.length; ++i) {
            _candidates[i].votes = 0;
        }

        startTime = startTs;
        endTime = endTs;

        emit ElectionStarted(currentElectionId, startTs, endTs);
    }

    function setVoterRoot(bytes32 root) external onlyOwner {
        voterRoot = root;
        emit VoterRootUpdated(root);
    }

    function setRewardPerVote(uint256 amount) external onlyOwner {
        rewardPerVote = amount;
        emit RewardPerVoteUpdated(amount);
    }

    /* ------------------------------ Voting ------------------------------ */

    function vote(uint256 candidateId, bytes32[] calldata merkleProof)
        external
        onlyActive
        nonReentrant
    {
        _checkEligible(msg.sender, merkleProof);
        _castVote(candidateId);
    }

    /// Questionnaire vote: choose closest candidate to voterPos (Euclidean distance).
    function voteByQuestionnaire(uint8[3] calldata voterPos, bytes32[] calldata merkleProof)
        external
        onlyActive
        nonReentrant
    {
        _checkEligible(msg.sender, merkleProof);

        uint256 n = _candidates.length;
        if (n == 0) revert InvalidCandidateId();

        uint256 best = 0;
        uint256 bestScore = _distanceSquared(voterPos, _candidates[0].positions);

        for (uint256 i = 1; i < n; ++i) {
            uint256 score = _distanceSquared(voterPos, _candidates[i].positions);
            if (score < bestScore) {
                bestScore = score;
                best = i;
            }
        }
        _castVote(best);
    }

    function _castVote(uint256 candidateId) internal {
        if (candidateId >= _candidates.length) revert InvalidCandidateId();
        if (lastVotedElection[msg.sender] == currentElectionId) revert AlreadyVoted();

        _candidates[candidateId].votes += 1;
        lastVotedElection[msg.sender] = currentElectionId;

        if (rewardPerVote > 0) {
            balToken.mint(msg.sender, rewardPerVote);
        }

        emit Voted(msg.sender, currentElectionId, candidateId);
    }

    /* ------------------------------- Views ------------------------------ */

    function isActive() external view returns (bool) { return _isActive(); }

    function candidateCount() external view returns (uint256) { return _candidates.length; }

    function hasVoted(address user) external view returns (bool) {
        return lastVotedElection[user] == currentElectionId;
    }

    function getVotingWindow() external view returns (uint64, uint64) {
        return (startTime, endTime);
    }

    function winnerId() public view returns (uint256 id) {
        uint256 n = _candidates.length;
        if (n == 0) return 0;
        uint256 best = 0;
        for (uint256 i = 1; i < n; ++i) {
            if (_candidates[i].votes > _candidates[best].votes) best = i;
        }
        return best;
    }

    function getWinnerWithNft()
        external
        view
        returns (uint256 id, string memory name, uint256 votes, uint256 tokenId, string memory uri)
    {
        if (_candidates.length == 0) return (0, "", 0, 0, "");
        id = winnerId();
        Candidate storage c = _candidates[id];
        return (id, c.name, c.votes, _candidateTokenIds[id], _candidateTokenUris[id]);
    }

    function getCandidateMeta(uint256 id_)
        external
        view
        returns (string memory name, uint8[3] memory pos, uint256 votes, uint256 tokenId, string memory uri)
    {
        if (id_ >= _candidates.length) revert InvalidCandidateId();
        Candidate storage c = _candidates[id_];
        return (c.name, c.positions, c.votes, _candidateTokenIds[id_], _candidateTokenUris[id_]);
    }

    function getAllCandidates()
        external
        view
        returns (string[] memory names, uint8[3][] memory pos, uint256[] memory votes)
    {
        uint256 n = _candidates.length;
        names = new string[](n);
        pos = new uint8[3][](n);
        votes = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            Candidate storage c = _candidates[i];
            names[i] = c.name;
            pos[i] = c.positions;
            votes[i] = c.votes;
        }
    }

    function getResults() external view returns (string[] memory names, uint256[] memory votes) {
        uint256 n = _candidates.length;
        names = new string[](n);
        votes = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            names[i] = _candidates[i].name;
            votes[i] = _candidates[i].votes;
        }
    }

    /* ----------------------------- Internals ---------------------------- */

    function _checkEligible(address voter, bytes32[] calldata proof) internal view {
        if (voterRoot == bytes32(0)) revert NotEligible();
        bytes32 leaf = keccak256(abi.encodePacked(voter));
        if (!MerkleProof.verifyCalldata(proof, voterRoot, leaf)) revert NotEligible();
    }

    function _distanceSquared(uint8[3] memory a, uint8[3] memory b) internal pure returns (uint256 s) {
        unchecked {
            for (uint256 i; i < 3; ++i) {
                int256 d = int256(uint256(a[i])) - int256(uint256(b[i]));
                s += uint256(d * d);
            }
        }
    }

    function _isActive() internal view returns (bool) {
        uint64 t = uint64(block.timestamp);
        return t >= startTime && t <= endTime;
    }
}
