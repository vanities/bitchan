// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanRecall} from "../src/BitchanRecall.sol";

/// @dev Per-citizen recall (Constitution Art. V): a 20% petition opens a removal
///      vote that passes at 2/3 of votes cast with a 25% turnout quorum; a
///      60%-of-eligible petition bypasses the quorum. Success removes the president.
contract BitchanRecallTest is Test {
    BitchanRepublic internal republic;
    BitchanRecall internal recall;

    address internal pres = address(0xB055); // the president under recall
    address internal gov = address(0x60F); // GOVERNANCE_ROLE (wires the recall)
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal dave = address(0xDA4E); // never a citizen

    uint256 internal constant FEE = 0.001 ether;
    uint256 internal constant COST = 0.003 ether;
    uint256 internal constant T = 100;

    function _claim(address who) internal {
        vm.prank(who);
        republic.claimCitizenship{value: COST}();
    }

    function _petition(address who) internal {
        vm.prank(who);
        recall.signPetition();
    }

    function setUp() public {
        republic = new BitchanRepublic(pres, FEE, COST, T, gov);
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(carol, 1 ether);
        vm.warp(365 days);

        _claim(alice);
        _claim(bob);
        _claim(carol); // citizenCount == 3
        vm.warp(block.timestamp + 61 days); // aged → canVote

        vm.prank(pres);
        republic.abdicate(); // recall only removes an elected (post-founding) president

        recall = new BitchanRecall(republic, pres, block.timestamp + 1 days, block.timestamp + 3 days);
        vm.prank(gov);
        republic.setRecall(address(recall));
    }

    function _openVoting() internal {
        vm.warp(recall.petitionUntil() + 1);
    }

    function _closeVoting() internal {
        vm.warp(recall.voteUntil() + 1);
    }

    // ─── Petition ─────────────────────────────────────────────────────────────

    function test_petition_requiresEligibleCitizen() public {
        vm.prank(dave);
        vm.expectRevert(BitchanRecall.NotEligible.selector);
        recall.signPetition();
    }

    function test_petition_noDouble() public {
        _petition(alice);
        vm.prank(alice);
        vm.expectRevert(BitchanRecall.AlreadyPetitioned.selector);
        recall.signPetition();
    }

    function test_petition_closesAfterWindow() public {
        _openVoting();
        vm.prank(alice);
        vm.expectRevert(BitchanRecall.NotPetitioning.selector);
        recall.signPetition();
    }

    function test_petition_meets20Percent() public {
        assertFalse(recall.petitionMet());
        _petition(alice); // 1/3 = 33% ≥ 20%
        assertTrue(recall.petitionMet());
    }

    // ─── Removal vote ─────────────────────────────────────────────────────────

    function test_vote_requiresPetitionMet() public {
        // no petition signed → vote cannot proceed
        _openVoting();
        vm.prank(alice);
        vm.expectRevert(BitchanRecall.PetitionNotMet.selector);
        recall.castVote(true);
    }

    function test_vote_onePerCitizen() public {
        _petition(alice);
        _openVoting();
        vm.startPrank(alice);
        recall.castVote(true);
        vm.expectRevert(BitchanRecall.AlreadyVoted.selector);
        recall.castVote(true);
        vm.stopPrank();
    }

    function test_vote_requiresEligibleCitizen() public {
        _petition(alice);
        _openVoting();
        vm.prank(dave);
        vm.expectRevert(BitchanRecall.NotEligible.selector);
        recall.castVote(true);
    }

    function test_vote_windowEnforced() public {
        _petition(alice);
        vm.prank(alice); // still petition window
        vm.expectRevert(BitchanRecall.NotVoting.selector);
        recall.castVote(true);
    }

    // ─── Finalization removes (or keeps) the president ───────────────────────

    function test_finalize_removesPresidentWhenPassed() public {
        _petition(alice);
        _petition(bob); // 2/3 ≥ 60% → quorum bypassed
        _openVoting();
        vm.prank(alice);
        recall.castVote(true);
        vm.prank(bob);
        recall.castVote(true);
        vm.prank(carol);
        recall.castVote(true); // 3 remove, 0 keep
        _closeVoting();

        vm.expectEmit(false, false, false, true);
        emit BitchanRecall.Finalized(true, 3, 3);
        recall.finalize();

        assertTrue(recall.removed());
        assertEq(republic.president(), address(0), "president removed");
    }

    function test_finalize_keepsPresidentWhenVoteFails() public {
        _petition(alice);
        _petition(bob);
        _openVoting();
        vm.prank(alice);
        recall.castVote(true); // 1 remove
        vm.prank(bob);
        recall.castVote(false);
        vm.prank(carol);
        recall.castVote(false); // 2 keep → 1/3 remove, below 2/3
        _closeVoting();

        recall.finalize();
        assertFalse(recall.removed());
        assertEq(republic.president(), pres, "president stays");
    }

    function test_finalize_revertsWhileVotingOpen() public {
        _petition(alice);
        _openVoting();
        vm.expectRevert(BitchanRecall.VotingOpen.selector);
        recall.finalize();
    }

    function test_finalize_noDouble() public {
        _petition(alice);
        _closeVoting();
        recall.finalize();
        vm.expectRevert(BitchanRecall.AlreadyFinalized.selector);
        recall.finalize();
    }

    // ─── The removal hook is locked to the wired recall ──────────────────────

    function test_removePresident_rejectsNonRecall() public {
        vm.prank(alice);
        vm.expectRevert(BitchanRepublic.NotRecall.selector);
        republic.removePresident();
    }
}
