// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanElections} from "../src/BitchanElections.sol";
import {BokkyPooBahsDateTimeLibrary as DT} from "BokkyPooBahsDateTimeLibrary/contracts/BokkyPooBahsDateTimeLibrary.sol";

/// @dev Recurring, calendar-driven presidential elections: nominate Dec 18–24,
///      vote Dec 25–31, inauguration Jan 1. One election per year, automatically —
///      no per-instance redeploy. One eligible citizen, one vote.
contract BitchanElectionsTest is Test {
    BitchanRepublic internal republic;
    BitchanElections internal elections;

    address internal pres = address(0xB055);
    address internal gov = address(0x60F);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal dave = address(0xDA4E); // never a citizen

    uint256 internal constant FEE = 0.001 ether;
    uint256 internal constant COST = 0.003 ether;
    uint256 internal constant T = 100;

    function _date(uint256 y, uint256 m, uint256 d) internal pure returns (uint256) {
        return DT.timestampFromDate(y, m, d);
    }

    function _claim(address who) internal {
        vm.prank(who);
        republic.claimCitizenship{value: COST}();
    }

    function _nominate(address who) internal {
        vm.prank(who);
        elections.nominate();
    }

    function _vote(address who, address candidate) internal {
        vm.prank(who);
        elections.castVote(candidate);
    }

    function setUp() public {
        republic = new BitchanRepublic(pres, FEE, COST, T, gov);
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(carol, 1 ether);

        vm.warp(_date(2027, 1, 1)); // citizens register Jan 1 2027
        _claim(alice);
        _claim(bob);
        _claim(carol);

        vm.warp(_date(2027, 4, 1)); // age > 60-day threshold
        vm.prank(pres);
        republic.abdicate(); // end founding so a winner can be installed

        elections = new BitchanElections(republic);
        vm.prank(pres);
        republic.setElection(address(elections));
    }

    // ── phase windows are driven by the calendar ──────────────────────────────

    function test_phase_followsCalendar() public {
        vm.warp(_date(2027, 6, 1));
        assertEq(elections.phase(), 2, "summer = closed");
        vm.warp(_date(2027, 12, 20));
        assertEq(elections.phase(), 0, "Dec 20 = nominating");
        vm.warp(_date(2027, 12, 28));
        assertEq(elections.phase(), 1, "Dec 28 = voting");
        vm.warp(_date(2027, 12, 31) + 23 hours);
        assertEq(elections.phase(), 1, "Dec 31 still voting");
        vm.warp(_date(2028, 1, 1));
        assertEq(elections.phase(), 2, "Jan 1 = closed");
    }

    // ── nomination window + eligibility ───────────────────────────────────────

    function test_nominate_onlyInWindow() public {
        vm.warp(_date(2027, 12, 28)); // voting window, not nominating
        vm.prank(alice);
        vm.expectRevert(BitchanElections.NotNominating.selector);
        elections.nominate();

        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        address[] memory cands = elections.candidates(2027);
        assertEq(cands.length, 1);
        assertEq(cands[0], alice);
    }

    function test_nominate_requiresEligibleCitizen() public {
        vm.warp(_date(2027, 12, 20));
        vm.prank(dave);
        vm.expectRevert(BitchanElections.NotEligible.selector);
        elections.nominate();
    }

    function test_nominate_noDoubleCandidacy() public {
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        vm.prank(alice);
        vm.expectRevert(BitchanElections.AlreadyCandidate.selector);
        elections.nominate();
    }

    // ── voting ────────────────────────────────────────────────────────────────

    function test_vote_onlyInWindow() public {
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        vm.prank(bob);
        vm.expectRevert(BitchanElections.NotVoting.selector); // still nominating
        elections.castVote(alice);

        vm.warp(_date(2027, 12, 28));
        _vote(bob, alice);
        assertEq(elections.votesOf(2027, alice), 1);
    }

    function test_oneVotePerCitizen() public {
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        vm.warp(_date(2027, 12, 28));
        _vote(bob, alice);
        vm.prank(bob);
        vm.expectRevert(BitchanElections.AlreadyVoted.selector);
        elections.castVote(alice);
    }

    // ── finalize installs the plurality winner ────────────────────────────────

    function test_finalize_installsWinner() public {
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        _nominate(bob);
        vm.warp(_date(2027, 12, 28));
        _vote(alice, alice);
        _vote(carol, alice);
        _vote(bob, bob); // alice 2, bob 1

        vm.warp(_date(2028, 1, 2));
        elections.finalize(2027);
        assertEq(elections.winnerOf(2027), alice);
        assertEq(republic.president(), alice, "winner is installed as president");
    }

    function test_finalize_notClosed_reverts() public {
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        vm.warp(_date(2027, 12, 28));
        _vote(bob, alice);
        // still within the election year — not closed
        vm.expectRevert(BitchanElections.NotClosed.selector);
        elections.finalize(2027);
    }

    function test_finalize_twice_reverts() public {
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        vm.warp(_date(2028, 1, 2));
        elections.finalize(2027);
        vm.expectRevert(BitchanElections.AlreadyFinalized.selector);
        elections.finalize(2027);
    }

    function test_finalize_noCandidates_reverts() public {
        vm.warp(_date(2028, 1, 2));
        vm.expectRevert(BitchanElections.NoCandidates.selector);
        elections.finalize(2027);
    }

    // ── the cadence: independent elections each year ──────────────────────────

    function test_recurringYears_areIndependent() public {
        // 2027: alice wins
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        _nominate(bob);
        vm.warp(_date(2027, 12, 28));
        _vote(alice, alice);
        _vote(bob, alice);
        vm.warp(_date(2028, 1, 2));
        elections.finalize(2027);
        assertEq(republic.president(), alice);

        // 2028: bob wins — fresh cycle, everyone can vote again
        vm.warp(_date(2028, 12, 20));
        _nominate(bob);
        _nominate(carol);
        vm.warp(_date(2028, 12, 28));
        _vote(alice, bob);
        _vote(bob, bob);
        _vote(carol, carol); // bob 2, carol 1
        vm.warp(_date(2029, 1, 2));
        elections.finalize(2028);
        assertEq(elections.winnerOf(2028), bob);
        assertEq(republic.president(), bob, "2028 winner replaces 2027's");
    }

    // ── a stale, never-finalized year cannot overwrite a newer president ──────

    function test_finalize_cannotReinstallStaleYearOverNewerPresident() public {
        // 2027 runs but is NEVER finalized (alice would have won).
        vm.warp(_date(2027, 12, 20));
        _nominate(alice);
        vm.warp(_date(2027, 12, 28));
        _vote(bob, alice);
        _vote(carol, alice);

        // 2028 runs and IS finalized → bob is the sitting president.
        vm.warp(_date(2028, 12, 20));
        _nominate(bob);
        vm.warp(_date(2028, 12, 28));
        _vote(alice, bob);
        _vote(carol, bob);
        vm.warp(_date(2029, 1, 2));
        elections.finalize(2028);
        assertEq(republic.president(), bob, "2028 winner installed");

        // The attack: finalize the older, skipped 2027 to reinstall alice over bob.
        vm.expectRevert(BitchanElections.StaleYear.selector);
        elections.finalize(2027);
        assertEq(republic.president(), bob, "a stale year cannot reinstall an old winner");
    }

    // ── founding blocks the recurring election ────────────────────────────────

    function test_nominate_blockedDuringFounding() public {
        // fresh republic that has NOT abdicated → founding still active
        BitchanRepublic r2 = new BitchanRepublic(pres, FEE, COST, T, gov);
        vm.deal(alice, 1 ether);
        vm.warp(_date(2030, 1, 1));
        vm.prank(alice);
        r2.claimCitizenship{value: COST}();
        vm.warp(_date(2030, 12, 20)); // aged + nomination window, but founding active
        BitchanElections e2 = new BitchanElections(r2);
        vm.prank(alice);
        vm.expectRevert(BitchanElections.FoundingActive.selector);
        e2.nominate();
    }
}
