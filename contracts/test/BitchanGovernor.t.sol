// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanGovernor} from "../src/BitchanGovernor.sol";

/// @dev Parameter + treasury governance: propose -> per-citizen 2/3 vote ->
///      timelock delay -> execute. The Timelock holds GOVERNANCE_ROLE, so it is
///      the only thing that can move a Governable lever or spend the treasury.
contract BitchanGovernorTest is Test {
    BitchanRepublic internal republic;
    BitchanGovernor internal governor;
    TimelockController internal timelock;

    address internal pres = address(0xB055);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal dave = address(0xDA4E); // never a citizen

    uint256 internal constant FEE = 0.001 ether;
    uint256 internal constant COST = 0.003 ether;
    uint256 internal constant T = 100;
    uint256 internal constant MIN_DELAY = 1 days;

    function _claim(address who) internal {
        vm.prank(who);
        republic.claimCitizenship{value: COST}();
    }

    function setUp() public {
        address[] memory empty = new address[](0);
        timelock = new TimelockController(MIN_DELAY, empty, empty, address(this));
        republic = new BitchanRepublic(pres, FEE, COST, T, address(timelock)); // GOVERNANCE_ROLE -> timelock
        governor = new BitchanGovernor(republic, timelock);

        // the governor proposes/cancels; anyone may execute after the delay
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));

        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(carol, 1 ether);
        vm.warp(365 days);
        _claim(alice);
        _claim(bob);
        _claim(carol);
        vm.warp(block.timestamp + 61 days); // aged → canVote
    }

    /// Drive a proposal from propose → execute, voting `support` from all 3 citizens.
    function _runProposal(address target, bytes memory cd, uint8 support) internal {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = target;
        values[0] = 0;
        calldatas[0] = cd;
        string memory desc = "gov action";
        bytes32 dh = keccak256(bytes(desc));

        vm.prank(alice);
        uint256 pid = governor.propose(targets, values, calldatas, desc);

        vm.warp(block.timestamp + governor.votingDelay() + 1);
        vm.prank(alice);
        governor.castVote(pid, support);
        vm.prank(bob);
        governor.castVote(pid, support);
        vm.prank(carol);
        governor.castVote(pid, support);

        vm.warp(block.timestamp + governor.votingPeriod() + 1);
        governor.queue(targets, values, calldatas, dh);
        vm.warp(block.timestamp + MIN_DELAY + 1);
        governor.execute(targets, values, calldatas, dh);
    }

    // ── A citizen vote changes a Governable parameter ────────────────────────

    function test_citizensCanChangeAParameter() public {
        assertEq(republic.postFee(), FEE);
        _runProposal(address(republic), abi.encodeCall(BitchanRepublic.setPostFee, (0.0005 ether)), 1);
        assertEq(republic.postFee(), 0.0005 ether, "fee changed by governance");
    }

    // ── A citizen vote spends the treasury (no president/founder hand) ───────

    function test_citizensCanSpendTheTreasury() public {
        vm.prank(pres);
        republic.abdicate(); // withdrawals are blocked during founding

        uint256 bal = republic.treasury(); // 3 * COST
        uint256 amount = bal / 10; // within the immutable ≤10%/7d rate-limit
        address recipient = address(0xBEEF);

        _runProposal(address(republic), abi.encodeCall(BitchanRepublic.withdraw, (recipient, amount)), 1);

        assertEq(recipient.balance, amount, "treasury disbursed by governance");
        assertEq(republic.treasury(), bal - amount);
    }

    // ── Voting power is one-per-citizen, never per token ─────────────────────

    function test_voteWeightIsOnePerCitizen() public {
        uint256 t = block.timestamp - 1;
        assertEq(governor.getVotes(alice, t), 1, "aged citizen has one vote");
        assertEq(governor.getVotes(dave, t), 0, "non-citizen has none");
    }

    // ── Only citizens can propose (proposal threshold = 1 vote) ──────────────

    function test_nonCitizenCannotPropose() public {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(republic);
        values[0] = 0;
        calldatas[0] = abi.encodeCall(BitchanRepublic.setPostFee, (0.0005 ether));

        vm.prank(dave);
        vm.expectRevert();
        governor.propose(targets, values, calldatas, "noncitizen");
    }

    // ── A proposal that fails the 2/3 bar cannot be executed ─────────────────

    function test_failedVoteDoesNotExecute() public {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(republic);
        values[0] = 0;
        calldatas[0] = abi.encodeCall(BitchanRepublic.setPostFee, (0.0005 ether));
        string memory desc = "rejected";
        bytes32 dh = keccak256(bytes(desc));

        vm.prank(alice);
        uint256 pid = governor.propose(targets, values, calldatas, desc);
        vm.warp(block.timestamp + governor.votingDelay() + 1);
        vm.prank(alice);
        governor.castVote(pid, 0); // against
        vm.prank(bob);
        governor.castVote(pid, 0); // against
        vm.prank(carol);
        governor.castVote(pid, 1); // for → 1/3, below 2/3
        vm.warp(block.timestamp + governor.votingPeriod() + 1);

        assertEq(uint8(governor.state(pid)), uint8(IGovernor.ProposalState.Defeated));
        vm.expectRevert();
        governor.queue(targets, values, calldatas, dh);
    }
}
