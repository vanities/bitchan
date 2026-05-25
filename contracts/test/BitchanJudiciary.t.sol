// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanJudiciary} from "../src/BitchanJudiciary.sol";

/// @dev Right of contest (Constitution Art. X): any citizen may contest a
///      consequential act by its actionId; an independent body (citizen
///      supermajority) may VOID it — 2/3 of votes cast with a 25% turnout quorum.
///      The chain records the contest + verdict; honoring a void is off-chain.
contract BitchanJudiciaryTest is Test {
    BitchanRepublic internal republic;
    BitchanJudiciary internal court;

    address internal pres = address(0xB055);
    address internal gov = address(0x60F);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal dave = address(0xDA4E); // never a citizen

    uint256 internal constant FEE = 0.001 ether;
    uint256 internal constant COST = 0.003 ether;
    uint256 internal constant T = 100;

    // an opaque id for the contested act (e.g. keccak of a Hidden event)
    bytes32 internal constant ACT = keccak256("hide:7");

    // verdicts
    uint8 internal constant PENDING = 0;
    uint8 internal constant UPHELD = 1;
    uint8 internal constant VOIDED = 2;

    function _claim(address who) internal {
        vm.prank(who);
        republic.claimCitizenship{value: COST}();
    }

    function setUp() public {
        republic = new BitchanRepublic(pres, FEE, COST, T, gov);
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(carol, 1 ether);
        vm.warp(365 days);
        _claim(alice);
        _claim(bob);
        _claim(carol);
        vm.warp(block.timestamp + 61 days); // aged → canVote

        court = new BitchanJudiciary(republic, 2 days);
    }

    function _contest(address who, bytes32 id) internal {
        vm.prank(who);
        court.contest(id);
    }

    // ─── Filing a contest ─────────────────────────────────────────────────────

    function test_contest_requiresEligibleCitizen() public {
        vm.prank(dave);
        vm.expectRevert(BitchanJudiciary.NotEligible.selector);
        court.contest(ACT);
    }

    function test_contest_opensReview() public {
        vm.expectEmit(true, true, false, false);
        emit BitchanJudiciary.Contested(ACT, alice);
        _contest(alice, ACT);
        assertEq(court.verdict(ACT), PENDING);
    }

    function test_contest_noDouble() public {
        _contest(alice, ACT);
        vm.prank(bob);
        vm.expectRevert(BitchanJudiciary.AlreadyContested.selector);
        court.contest(ACT);
    }

    // ─── Voting on a contest ───────────────────────────────────────────────────

    function test_vote_requiresOpenContest() public {
        vm.prank(alice);
        vm.expectRevert(BitchanJudiciary.NotContested.selector);
        court.castVote(ACT, true);
    }

    function test_vote_onePerCitizen() public {
        _contest(alice, ACT);
        vm.startPrank(bob);
        court.castVote(ACT, true);
        vm.expectRevert(BitchanJudiciary.AlreadyVoted.selector);
        court.castVote(ACT, true);
        vm.stopPrank();
    }

    function test_vote_requiresEligible() public {
        _contest(alice, ACT);
        vm.prank(dave);
        vm.expectRevert(BitchanJudiciary.NotEligible.selector);
        court.castVote(ACT, true);
    }

    function test_vote_closesAfterDeadline() public {
        _contest(alice, ACT);
        vm.warp(block.timestamp + 2 days + 1);
        vm.prank(bob);
        vm.expectRevert(BitchanJudiciary.Closed.selector);
        court.castVote(ACT, true);
    }

    // ─── Ruling ────────────────────────────────────────────────────────────────

    function test_rule_voidsOnSupermajority() public {
        _contest(alice, ACT);
        vm.prank(alice);
        court.castVote(ACT, true);
        vm.prank(bob);
        court.castVote(ACT, true);
        vm.prank(carol);
        court.castVote(ACT, true); // 3 void, 0 uphold
        vm.warp(block.timestamp + 2 days + 1);

        vm.expectEmit(true, false, false, true);
        emit BitchanJudiciary.Ruled(ACT, VOIDED);
        court.rule(ACT);
        assertEq(court.verdict(ACT), VOIDED);
    }

    function test_rule_upholdsWithoutSupermajority() public {
        _contest(alice, ACT);
        vm.prank(alice);
        court.castVote(ACT, true); // 1 void
        vm.prank(bob);
        court.castVote(ACT, false);
        vm.prank(carol);
        court.castVote(ACT, false); // 2 uphold → below 2/3
        vm.warp(block.timestamp + 2 days + 1);

        court.rule(ACT);
        assertEq(court.verdict(ACT), UPHELD);
    }

    function test_rule_revertsBeforeDeadline() public {
        _contest(alice, ACT);
        vm.expectRevert(BitchanJudiciary.NotClosed.selector);
        court.rule(ACT);
    }

    function test_rule_noDouble() public {
        _contest(alice, ACT);
        vm.warp(block.timestamp + 2 days + 1);
        court.rule(ACT);
        vm.expectRevert(BitchanJudiciary.AlreadyRuled.selector);
        court.rule(ACT);
    }
}
