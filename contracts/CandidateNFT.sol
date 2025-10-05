// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

// -----------------------------------------------------------------------------
// Custom Errors
// -----------------------------------------------------------------------------
error ZeroAddress();

/**
 * @title CandidateNFT
 * @notice ERC721 NFTs representing election candidates
 * @dev Features:
 *      - On-chain metadata URIs
 *      - 10% creator royalty (ERC-2981)
 *      - Owner transfer history tracking
 *      - Compatible with OpenZeppelin Contracts v5.x
 */
contract CandidateNFT is ERC721, ERC2981, Ownable {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    uint96 private constant ROYALTY_BASIS_POINTS = 1000; // 10%

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    uint256 private _nextTokenId = 1;

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address[]) private _ownerHistory;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    /// @param _initialOwner Address that will own the contract and receive royalties
    constructor(address _initialOwner)
        ERC721("CandidateNFT", "CNFT")
        Ownable(_initialOwner)
    {
        if (_initialOwner == address(0)) revert ZeroAddress();
        _setDefaultRoyalty(_initialOwner, ROYALTY_BASIS_POINTS);
    }

    // -------------------------------------------------------------------------
    // Minting
    // -------------------------------------------------------------------------
    
    /// @notice Mint new candidate NFT
    /// @dev Only owner (typically Voting contract) can mint
    /// @param to Recipient address
    /// @param uri Metadata URI (e.g., ipfs://...)
    /// @return tokenId The minted token ID
    function mint(address to, string memory uri)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (to == address(0)) revert ZeroAddress();
        
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        _ownerHistory[tokenId].push(to);
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------
    
    /// @notice Get token metadata URI
    /// @dev Overrides ERC721 to return stored URI
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // -------------------------------------------------------------------------
    // History Tracking
    // -------------------------------------------------------------------------
    
    /// @notice Get complete ownership history for a token
    /// @param tokenId Token to query
    /// @return Array of all historical owners (chronological order)
    function getOwnerHistory(uint256 tokenId) 
        external 
        view 
        returns (address[] memory) 
    {
        _requireOwned(tokenId);
        return _ownerHistory[tokenId];
    }

    // -------------------------------------------------------------------------
    // Hooks
    // -------------------------------------------------------------------------
    
    /// @dev Override to track ownership changes and clean up on burn
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        if (to == address(0)) {
            // Token is being burned - clean up storage
            delete _tokenURIs[tokenId];
            delete _ownerHistory[tokenId];
        } else if (from != address(0)) {
            // Token is being transferred (not minted)
            _ownerHistory[tokenId].push(to);
        }
        // If from == address(0), it's a mint - already handled in mint()
        
        return from;
    }

    // -------------------------------------------------------------------------
    // Interface Support
    // -------------------------------------------------------------------------
    
    /// @dev ERC165 support for ERC721 + ERC2981
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}