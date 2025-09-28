// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BALToken
 * @dev ERC20 token used as reward in the voting DApp. The contract owner can set
 * a minter address (e.g. Voting contract), and both owner and minter can mint tokens.
 */
contract BALToken is ERC20, Ownable {
    address public minter;

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        // initially, no minter. Owner has the ability to mint or set minter.
    }

    /**
     * @notice Set a minter address (e.g. voting contract) that is allowed to mint.
     * @dev Only callable by the owner.
     * @param _minter The address to grant minting rights.
     */
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    /**
     * @notice Mint new tokens to an address.
     * @dev Can be called by owner or minter only.
     * @param to The recipient of minted tokens.
     * @param amount The amount to mint (in base units, i.e. including decimals).
     */
    function mint(address to, uint256 amount) external {
        require(
            msg.sender == owner() || msg.sender == minter,
            "BALToken: caller not owner or minter"
        );
        _mint(to, amount);
    }
}
