// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanElection} from "../src/BitchanElection.sol";

/// @dev Per-citizen presidential election: one eligible citizen, one vote;
///      plurality winner is installed as president via the republic.
contract BitchanElectionTest is Test {
    BitchanRepublic internal republic;
    BitchanElection internal election;

    address internal pres = address(0xB055);
    address internal gov = address(0x60F);
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

    function _nominate(address who) internal {
        vm.prank(who);
        election.nominate();
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
        vm.warp(block.timestamp + 61 days); // age past the 60-day threshold → canVote

        vm.prank(pres);
        republic.abdicate(); // end founding so a winner can be installed

        election = new BitchanElection(republic, block.timestamp + 1 days, block.timestamp + 3 days);
        vm.prank(pres);
        republic.setElection(address(election));
    }

    function _openVoting() internal {
        vm.warp(election.nominateUntil() + 1);
    }

    function _closeVoting() internal {
        vm.warp(election.voteUntil() + 1);
    }

    // ─── Nomination ──────────────────────────────────────────────────────────

    function test_nominate_addsEligibleCandidate() public {
        vm.expectEmit(true, false, false, false);
        emit BitchanElection.Nominated(alice);
        _nominate(alice);
        assertTrue(election.isCandidate(alice));
        assertEq(election.candidateCount(), 1);
    }

    function test_nominate_requiresEligibleCitizen() public {
        vm.prank(dave);
        vm.expectRevert(BitchanElection.NotEligible.selector);
        election.nominate();
    }

    function test_nominate_noDouble() public {
        _nominate(alice);
        vm.prank(alice);
        vm.expectRevert(BitchanElection.AlreadyCandidate.selector);
        election.nominate();
    }

    function test_nominate_closesAfterWindow() public {
        _openVoting();
        vm.prank(alice);
        vm.expectRevert(BitchanElection.NotNominating.selector);
        election.nominate();
    }

    // ─── Voting: one citizen, one vote ───────────────────────────────────────

    function test_vote_talliesAndTracksLeader() public {
        _nominate(alice);
        _nominate(bob);
        _openVoting();

        vm.prank(carol);
        election.castVote(alice);
        assertEq(election.votesFor(alice), 1);
        assertTrue(election.hasVoted(carol));
        assertEq(election.leader(), alice);
        assertEq(election.totalVotes(), 1);
    }

    function test_vote_onePerCitizen() public {
        _nominate(alice);
        _openVoting();
        vm.startPrank(carol);
        election.castVote(alice);
        vm.expectRevert(BitchanElection.AlreadyVoted.selector);
        election.castVote(alice);
        vm.stopPrank();
    }

    function test_vote_requiresEligibleCitizen() public {
        _nominate(alice);
        _openVoting();
        vm.prank(dave);
        vm.expectRevert(BitchanElection.NotEligible.selector);
        election.castVote(alice);
    }

    function test_vote_rejectsUnknownCandidate() public {
        _openVoting();
        vm.prank(carol);
        vm.expectRevert(BitchanElection.UnknownCandidate.selector);
        election.castVote(dave);
    }

    function test_vote_rejectedBeforeVotingOpens() public {
        _nominate(alice);
        vm.prank(carol); // still in nomination window
        vm.expectRevert(BitchanElection.NotVoting.selector);
        election.castVote(alice);
    }

    function test_vote_rejectedAfterVotingCloses() public {
        _nominate(alice);
        _closeVoting();
        vm.prank(carol);
        vm.expectRevert(BitchanElection.NotVoting.selector);
        election.castVote(alice);
    }

    // ─── Finalization installs the winner as president ───────────────────────

    function test_finalize_installsWinnerAsPresident() public {
        _nominate(alice);
        _nominate(bob);
        _openVoting();
        vm.prank(carol);
        election.castVote(alice);
        vm.prank(alice);
        election.castVote(alice); // alice: 2
        vm.prank(bob);
        election.castVote(bob); // bob: 1
        _closeVoting();

        vm.expectEmit(true, false, false, true);
        emit BitchanElection.Finalized(alice, 2);
        election.finalize();

        assertTrue(election.finalized());
        assertEq(election.winner(), alice);
        assertEq(republic.president(), alice, "winner becomes president");
    }

    function test_finalize_revertsWhileVotingOpen() public {
        _nominate(alice);
        _openVoting();
        vm.expectRevert(BitchanElection.VotingOpen.selector);
        election.finalize();
    }

    function test_finalize_noDouble() public {
        _nominate(alice);
        _closeVoting();
        election.finalize();
        vm.expectRevert(BitchanElection.AlreadyFinalized.selector);
        election.finalize();
    }

    // ─── The handoff is locked to the wired election ─────────────────────────

    function test_installPresident_rejectsNonElection() public {
        vm.prank(alice);
        vm.expectRevert(BitchanRepublic.NotElection.selector);
        republic.installPresident(alice);
    }
}
