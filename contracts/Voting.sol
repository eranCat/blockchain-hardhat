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

    /// @notice Represents a candidate in the election.
    struct Candidate {
        string name;
        uint256 votes;
        uint8[3] positions; // [economics, social, foreign] 0..10
    }

    /* ------------------------------ Storage ------------------------------ */
    /// @dev Array of all candidates. The index is the candidate's ID.
    Candidate[] private _candidates;
    /// @dev Maps candidate ID to their corresponding NFT token ID.
    uint256[] private _candidateTokenIds;
    /// @dev Maps candidate ID to their corresponding NFT token URI.
    string[]  private _candidateTokenUris;

    /// @notice The timestamp when the current election starts.
    uint64 public startTime;
    /// @notice The timestamp when the current election ends.
    uint64 public endTime;

    /// @notice A unique identifier for the current election session, incremented for each new election.
    uint256 public currentElectionId;
    /// @dev Tracks the last election ID a user voted in to prevent double voting.
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

    /**
     * @dev Initializes the contract with addresses for the reward token and candidate NFT.
     * @param balToken_ The address of the ERC20 reward token contract.
     * @param candidateNft_ The address of the ERC721 candidate NFT contract.
     */
    constructor(address balToken_, address candidateNft_, uint256 rewardPerVote_) Ownable(msg.sender) {
        require(balToken_ != address(0) && candidateNft_ != address(0), "addr=0");
        balToken = IBALToken(balToken_);
        candidateNft = ICandidateNFT(candidateNft_);
        rewardPerVote = rewardPerVote_;
    }

    /* ----------------------------- Modifiers ---------------------------- */
    modifier onlyActive() {
        /// @dev Ensures the function can only be called during an active election window.
        if (!_isActive()) revert VotingClosed();
        _;
    }

    /* ----------------------------- Admin API ---------------------------- */

    /**
     * @notice Updates the address of the CandidateNFT contract.
     * @dev Useful if the NFT contract needs to be redeployed.
     * @param nft The new address of the CandidateNFT contract.
     */
    function setCandidateNft(address nft) external onlyOwner {
        require(nft != address(0), "nft=0");
        candidateNft = ICandidateNFT(nft);
        emit CandidateNFTContractUpdated(nft);
    }

    /**
     * @notice Clears existing candidates and sets a new list, minting an NFT for each.
     * @dev This is an atomic operation. It deletes all previous candidate data.
     * The lengths of all input arrays must match.
     */
    function setCandidatesWithNFT(
        string[] calldata names,
        uint8[3][] calldata positions,
        string[] calldata uris,
        address[] calldata receivers
    ) external onlyOwner {
        uint256 len = names.length;
        require(len > 0, "no candidates");
        require(len == positions.length && len == uris.length && len == receivers.length, "bad lengths");

        // Clear previous candidate data if it exists.
        uint256 prev = _candidates.length;
        if (prev > 0) {
            delete _candidates;
            delete _candidateTokenIds;
            delete _candidateTokenUris;
            emit CandidatesCleared(prev);
        }

        // Add new candidates and mint their corresponding NFTs.
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

    /**
     * @notice Starts a new election, resetting all vote counts and defining a new voting window.
     * @dev Increments `currentElectionId` to create a new, distinct voting session.
     */
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

    /**
     * @notice Sets the Merkle root for the list of eligible voters.
     * @param root The new Merkle root.
     */
    function setVoterRoot(bytes32 root) external onlyOwner {
        voterRoot = root;
        emit VoterRootUpdated(root);
    }

    /**
     * @notice Updates the amount of BAL tokens rewarded for a vote.
     * @param amount The new reward amount.
     */
    function setRewardPerVote(uint256 amount) external onlyOwner {
        rewardPerVote = amount;
        emit RewardPerVoteUpdated(amount);
    }

    /* ------------------------------ Voting ------------------------------ */

    /**
     * @notice Casts a vote for a specific candidate.
     * @param candidateId The ID of the candidate to vote for.
     * @param merkleProof The Merkle proof demonstrating the voter's eligibility.
     */
    function vote(uint256 candidateId, bytes32[] calldata merkleProof)
        external
        onlyActive
        nonReentrant
    {
        _checkEligible(msg.sender, merkleProof);
        _castVote(candidateId);
    }

    /**
     * @notice Casts a vote by finding the candidate with the closest policy positions.
     * @param voterPos The voter's positions on key issues.
     * @param merkleProof The Merkle proof demonstrating the voter's eligibility.
     */
    function voteByQuestionnaire(uint8[3] calldata voterPos, bytes32[] calldata merkleProof)
        external
        onlyActive
        nonReentrant
    {
        _checkEligible(msg.sender, merkleProof);

        uint256 n = _candidates.length;
        if (n == 0) revert InvalidCandidateId();

        // Find the candidate with the minimum squared Euclidean distance.
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

    /**
     * @dev Internal logic to record a vote, prevent double voting, and distribute rewards.
     * @param candidateId The ID of the candidate receiving the vote.
     */
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

    /// @notice Checks if the election is currently active.
    function isActive() external view returns (bool) { return _isActive(); }

    /// @notice Returns the total number of candidates.
    function candidateCount() external view returns (uint256) { return _candidates.length; }

    /**
     * @notice Checks if a specific user has already voted in the current election.
     * @param user The address of the user to check.
     */
    function hasVoted(address user) external view returns (bool) {
        return lastVotedElection[user] == currentElectionId;
    }

    /// @notice Returns the start and end timestamps of the current voting window.
    function getVotingWindow() external view returns (uint64, uint64) {
        return (startTime, endTime);
    }

    /**
     * @notice Determines the winning candidate based on the current vote count.
     */
    function winnerId() public view returns (uint256 id) {
        uint256 n = _candidates.length;
        if (n == 0) return 0;
        uint256 best = 0;
        for (uint256 i = 1; i < n; ++i) {
            if (_candidates[i].votes > _candidates[best].votes) best = i;
        }
        return best;
    }

    /**
     * @notice Gets all metadata for the winning candidate, including NFT details.
     */
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

    /**
     * @notice Gets all metadata for a specific candidate by their ID.
     * @param id_ The ID of the candidate.
     */
    function getCandidateMeta(uint256 id_)
        external
        view
        returns (string memory name, uint8[3] memory pos, uint256 votes, uint256 tokenId, string memory uri)
    {
        if (id_ >= _candidates.length) revert InvalidCandidateId();
        Candidate storage c = _candidates[id_];
        return (c.name, c.positions, c.votes, _candidateTokenIds[id_], _candidateTokenUris[id_]);
    }

    /**
     * @notice Retrieves the names, positions, and vote counts for all candidates.
     */
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

    /**
     * @notice Retrieves the names and vote counts for all candidates, suitable for displaying results.
     */
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

    /**
     * @dev Verifies if a voter is eligible by checking a Merkle proof against the `voterRoot`.
     * @param voter The address of the voter.
     * @param proof The Merkle proof provided by the voter.
     */
    function _checkEligible(address voter, bytes32[] calldata proof) internal view {
        if (voterRoot == bytes32(0)) revert NotEligible();
        bytes32 leaf = keccak256(abi.encodePacked(voter));
        if (!MerkleProof.verifyCalldata(proof, voterRoot, leaf)) revert NotEligible();
    }

    /**
     * @dev Calculates the squared Euclidean distance between two 3D position vectors.
     */
    function _distanceSquared(uint8[3] memory a, uint8[3] memory b) internal pure returns (uint256 s) {
        unchecked {
            for (uint256 i; i < 3; ++i) {
                int256 d = int256(uint256(a[i])) - int256(uint256(b[i]));
                s += uint256(d * d);
            }
        }
    }

    /**
     * @dev Internal function to check if the current block timestamp is within the voting window.
     */
    function _isActive() internal view returns (bool) {
        uint64 t = uint64(block.timestamp);
        return t >= startTime && t <= endTime;
    }
}
