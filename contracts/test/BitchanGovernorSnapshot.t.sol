// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanGovernor} from "../src/BitchanGovernor.sol";

/// @dev Finding #4: per-citizen voting power AND the quorum denominator must be
///      snapshotted at the proposal's timepoint, not read live. Otherwise the
///      citizen population can be changed (mass claim, or a slash) AFTER votes are
///      locked to freeze a passed proposal or force a borderline one through.
contract BitchanGovernorSnapshotTest is Test {
    BitchanRepublic internal republic;
    BitchanGovernor internal governor;
    TimelockController internal timelock;

    address internal pres = address(0xB055);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);

    uint256 internal constant FEE = 0.001 ether;
    uint256 internal constant COST = 0.003 ether;
    uint256 internal constant T = 1000;
    uint256 internal constant MIN_DELAY = 1 days;

    function _claim(address who) internal {
        vm.deal(who, 1 ether);
        vm.prank(who);
        republic.claimCitizenship{value: COST}();
    }

    // Claim `n` fresh citizens (distinct address range per `start`). They count
    // toward citizenCount but don't vote — population, not electorate.
    function _addCitizens(uint256 start, uint256 n) internal {
        for (uint256 i = 0; i < n; i++) {
            _claim(address(uint160(0x100000 + start + i)));
        }
    }

    function setUp() public {
        address[] memory empty = new address[](0);
        timelock = new TimelockController(MIN_DELAY, empty, empty, address(this));
        republic = new BitchanRepublic(pres, FEE, COST, T, address(timelock));
        governor = new BitchanGovernor(republic, timelock);
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));

        vm.warp(365 days);
        _claim(alice);
        _claim(bob);
        _claim(carol);
        vm.warp(block.timestamp + 61 days); // aged → can vote
    }

    function _proposeSetFee(uint256 newFee, string memory desc)
        internal
        returns (uint256 pid, address[] memory targets, uint256[] memory values, bytes[] memory calldatas)
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0] = address(republic);
        values[0] = 0;
        calldatas[0] = abi.encodeCall(BitchanRepublic.setPostFee, (newFee));
        vm.prank(alice);
        pid = governor.propose(targets, values, calldatas, desc);
    }

    // ── #4: quorum is fixed at the snapshot — post-vote inflation can't freeze ──
    function test_postVoteCitizenInflationCannotFreezeAPassedProposal() public {
        // Population at proposal time: 3 aged voters + 9 fillers = 12 → quorum = 3.
        _addCitizens(0, 9);
        assertEq(republic.citizenCount(), 12);

        (uint256 pid, address[] memory t, uint256[] memory v, bytes[] memory cd) =
            _proposeSetFee(0.0005 ether, "snapshot quorum");

        vm.warp(block.timestamp + governor.votingDelay() + 1);
        vm.prank(alice);
        governor.castVote(pid, 1);
        vm.prank(bob);
        governor.castVote(pid, 1);
        vm.prank(carol);
        governor.castVote(pid, 1); // 3 FOR ≥ quorum(3) and ≥ 2/3

        vm.warp(block.timestamp + governor.votingPeriod() + 1);

        // The attack: flood citizenship so the LIVE quorum (24/4 = 6) exceeds the
        // 3 votes the proposal legitimately earned. With a live quorum this freezes
        // the proposal (Defeated); with a snapshotted quorum it must still pass.
        _addCitizens(1000, 12);
        assertEq(republic.citizenCount(), 24);

        assertEq(
            uint8(governor.state(pid)),
            uint8(IGovernor.ProposalState.Succeeded),
            "quorum must be measured at the snapshot, not live"
        );

        bytes32 dh = keccak256(bytes("snapshot quorum"));
        governor.queue(t, v, cd, dh);
        vm.warp(block.timestamp + MIN_DELAY + 1);
        governor.execute(t, v, cd, dh);
        assertEq(republic.postFee(), 0.0005 ether, "passed proposal executed despite the flood");
    }

    // ── #4: a citizen's voting power is fixed at the snapshot ───────────────────
    function test_votingPowerIsMeasuredAtSnapshotNotLive() public {
        uint256 snap = block.timestamp - 1; // a finalized timepoint where alice is an aged citizen
        assertEq(governor.getVotes(alice, snap), 1, "aged citizen has a vote at the snapshot");

        // Governance slashes alice later.
        vm.warp(block.timestamp + 10 days);
        vm.prank(address(timelock));
        republic.slash(alice);

        assertEq(governor.getVotes(alice, block.timestamp), 0, "slashed citizen has no live vote");
        // The vote she held AT the snapshot must be preserved — reading it live is the bug.
        assertEq(governor.getVotes(alice, snap), 1, "voting power at the snapshot is immutable");
    }
}
