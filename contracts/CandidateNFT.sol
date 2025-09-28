// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title CandidateNFT
 * @dev ERC721 with simple on-chain tokenURI storage, 10% royalty (ERC-2981),
 *      and basic owner-history. Compatible with OpenZeppelin Contracts v5.x.
 */
contract CandidateNFT is ERC721, ERC2981, Ownable {
    uint256 private _nextId = 1;

    // On-chain metadata pointers per token
    mapping(uint256 => string) private _tokenURIs;

    // Append-only history of owners per token
    mapping(uint256 => address[]) private _ownerHistory;

    constructor(address initialOwner)
        ERC721("CandidateNFT", "CNFT")
        Ownable(initialOwner)
    {
        // 10% royalty to the creator/owner (1000 bps)
        _setDefaultRoyalty(initialOwner, 1000);
    }

    function mint(address to, string memory uri)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        _ownerHistory[tokenId].push(to);
    }

    /// Read the stored token URI (OZ recommends overriding tokenURI if you store URIs yourself)
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireOwned(tokenId); // from ERC721 v5
        return _tokenURIs[tokenId];
    }

    /// Optional: read back the owner history
    function ownerHistory(uint256 tokenId) external view returns (address[] memory) {
        return _ownerHistory[tokenId];
    }

    /// v5 unified hook for mint/transfer/burn. Handle history + cleanup here.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        if (to == address(0)) {
            // BURN: clean per-token storage
            delete _tokenURIs[tokenId];
            delete _ownerHistory[tokenId];
        } else {
            // MINT or TRANSFER: append recipient to history
            _ownerHistory[tokenId].push(to);
        }
    }

    /// ERC165 support (ERC721 + ERC2981)
    function supportsInterface(bytes4 iid)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(iid);
    }
}
