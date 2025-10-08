// contracts/CandidateNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * ERC-721 with enforced 10% creator fee on each ownership change + on-chain owner history.
 * Direct user transfers are blocked by overriding _update; ownership changes only via buy().
 */
contract CandidateNFT is ERC721URIStorage, ERC2981, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public immutable creator;        // receives 10%
    uint256 private _nextId;

    // tokenId => ordered owners (mint + every transfer)
    mapping(uint256 => address[]) private _ownerHistory;

    struct Listing {
        address seller;
        uint256 priceWei;
        bool active;
    }
    mapping(uint256 => Listing) public listings;

    // Lock direct user transfers; allow only internal transfers triggered by buy()
    bool public transfersLocked = true;
    bool private _internalTransfer; // set true during buy(), false otherwise

    event Minted(uint256 indexed tokenId, address indexed to, string uri);
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 priceWei);
    event Unlisted(uint256 indexed tokenId);
    event Purchased(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 priceWei, uint256 creatorFee);

    constructor(address creator_) ERC721("CandidateNFT", "CNFT") {
        require(creator_ != address(0), "creator=0");
        creator = creator_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // 10% default royalty for marketplaces that honor EIP-2981
        _setDefaultRoyalty(creator_, 1000);
    }

    // ----------------------------- Minting -----------------------------
    function mintTo(address to, string calldata tokenURI_) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "to=0");
        tokenId = ++_nextId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        emit Minted(tokenId, to, tokenURI_);
    }

    // -------------------------- Owner History -------------------------
    function ownerHistory(uint256 tokenId) external view returns (address[] memory) {
        _requireOwned(tokenId);
        return _ownerHistory[tokenId];
    }

    /**
     * OZ v5 transfer/mint/burn hook. Enforce “no direct user transfers” and record history.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override(ERC721)
        returns (address from)
    {
        // Detect transfer vs mint/burn *before* calling super
        address prevOwner = _ownerOf(tokenId);
        bool isTransfer = (prevOwner != address(0) && to != address(0));

        // Block direct user transfers unless allowed internally by buy()
        if (isTransfer && transfersLocked && !_internalTransfer) {
            revert("Direct transfer blocked; use buy()");
        }

        // Perform state update
        from = super._update(to, tokenId, auth);

        // Record owner history for mint & transfers (skip burn)
        if (to != address(0)) {
            _ownerHistory[tokenId].push(to);
        }
    }

    // ------------------------ Listing & Purchase -----------------------
    function listToken(uint256 tokenId, uint256 priceWei) external {
        address owner = _requireOwned(tokenId);
        require(msg.sender == owner, "not owner");
        require(priceWei > 0, "price=0");
        listings[tokenId] = Listing({seller: owner, priceWei: priceWei, active: true});
        emit Listed(tokenId, owner, priceWei);
    }

    function unlistToken(uint256 tokenId) external {
        Listing memory L = listings[tokenId];
        require(L.active, "not listed");
        require(msg.sender == L.seller, "not seller");
        delete listings[tokenId];
        emit Unlisted(tokenId);
    }

    /// Buy listed token (10% → creator, 90% → seller); enables a single internal transfer.
    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory L = listings[tokenId];
        require(L.active, "not listed");
        require(msg.sender != L.seller, "seller==buyer");
        require(msg.value == L.priceWei, "wrong value");

        delete listings[tokenId];

        uint256 creatorFee = (msg.value * 10) / 100;
        uint256 sellerProceeds = msg.value - creatorFee;

        (bool ok1, ) = creator.call{value: creatorFee}("");
        require(ok1, "creator pay failed");

        (bool ok2, ) = L.seller.call{value: sellerProceeds}("");
        require(ok2, "seller pay failed");

        // Allow exactly this internal transfer
        _internalTransfer = true;
        _safeTransfer(L.seller, msg.sender, tokenId);
        _internalTransfer = false;

        emit Purchased(tokenId, L.seller, msg.sender, msg.value, creatorFee);
    }

    // -------------------------- Admin / Config ------------------------
    function setTransfersLocked(bool locked) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transfersLocked = locked;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // ----------------------------- Introspection ----------------------
    function supportsInterface(bytes4 iid)
        public
        view
        override(ERC721URIStorage, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }
}