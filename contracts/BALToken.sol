// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// -----------------------------------------------------------------------------
// Custom Errors
// -----------------------------------------------------------------------------
error UnauthorizedMinter(address caller);
error ZeroAddress();

/**
 * @title BALToken
 * @notice ERC20 token used as voting reward in the election DApp
 * @dev Owner can mint directly or delegate minting rights to a minter (e.g., Voting contract)
 */
contract BALToken is ERC20, Ownable {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event MinterUpdated(address indexed previousMinter, address indexed newMinter);

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    address public minter;

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------
    modifier onlyOwnerOrMinter() {
        if (msg.sender != owner() && msg.sender != minter) {
            revert UnauthorizedMinter(msg.sender);
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _owner Initial owner address
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        if (_owner == address(0)) revert ZeroAddress();
    }

    // -------------------------------------------------------------------------
    // Admin Functions
    // -------------------------------------------------------------------------
    
    /// @notice Set or update the authorized minter address
    /// @dev Only owner can call. Emits MinterUpdated event
    /// @param _minter Address to grant minting rights (can be address(0) to revoke)
    function setMinter(address _minter) external onlyOwner {
        address previousMinter = minter;
        minter = _minter;
        emit MinterUpdated(previousMinter, _minter);
    }

    // -------------------------------------------------------------------------
    // Minting
    // -------------------------------------------------------------------------
    
    /// @notice Mint new tokens
    /// @dev Can be called by owner or authorized minter
    /// @param to Recipient address
    /// @param amount Amount to mint (in base units including decimals)
    function mint(address to, uint256 amount) external onlyOwnerOrMinter {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }
}