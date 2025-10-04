// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Voting} from "../contracts/Voting.sol";
import {BALToken} from "../contracts/BALToken.sol";
import {CandidateNFT} from "../contracts/CandidateNFT.sol";

contract VotingTest is Test {
    Voting public voting;
    BALToken public balToken;
    CandidateNFT public nft;
    
    address owner = address(this);
    address voter1 = address(0x1);
    address voter2 = address(0x2);

    function setUp() public {
        // Deploy contracts
        balToken = new BALToken("BAL Token", "BAL", owner);
        nft = new CandidateNFT(owner);
        voting = new Voting(address(balToken), 1000, address(nft));
        
        // Setup permissions
        balToken.setMinter(address(voting));
        nft.transferOwnership(address(voting));
    }

    function test_DeploymentSuccess() public view {
        assertEq(voting.candidateCount(), 0);
        assertEq(address(voting.balToken()), address(balToken));
    }

    function test_AddCandidate() public {
        uint8[3] memory positions = [uint8(5), uint8(5), uint8(5)];
        voting.setCandidate("Alice", positions);
        
        assertEq(voting.candidateCount(), 1);
        
        (string memory name, uint8[3] memory pos, uint256 votes) = voting.getCandidate(0);
        assertEq(name, "Alice");
        assertEq(pos[0], 5);
        assertEq(votes, 0);
    }

    function test_BatchSetCandidates() public {
        string[] memory names = new string[](3);
        names[0] = "Alice";
        names[1] = "Bob";
        names[2] = "Charlie";
        
        voting.setCandidates(names);
        
        assertEq(voting.candidateCount(), 3);
    }

    function test_RevertInvalidPosition() public {
        uint8[3] memory positions = [uint8(11), uint8(5), uint8(5)]; // 11 > 10
        
        vm.expectRevert();
        voting.setCandidate("Alice", positions);
    }
}