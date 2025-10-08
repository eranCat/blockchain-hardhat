// contracts/BALToken.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BALToken
 * @notice Reward token minted to voters after a successful vote.
 * @dev Uses AccessControl with MINTER_ROLE granted to the Voting contract.
 */
contract BALToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(string memory name_, string memory symbol_, address admin_) ERC20(name_, symbol_) {
        require(admin_ != address(0), "admin=0");
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        // no premint; rewards are minted on demand by Voting
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
