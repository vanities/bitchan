// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {BitchanRepublic} from "./BitchanRepublic.sol";

/// @title BitchanGovernor — per-citizen governance of parameters + treasury.
/// @notice OZ Governor + Timelock, but with ONE override that is the whole point:
///         voting power is 1 per eligible citizen at the proposal snapshot, never a
///         token balance. The Timelock holds the republic's GOVERNANCE_ROLE, so the
///         only path to change a Governable parameter or spend the treasury is
///         propose -> 2/3 citizen vote -> timelock delay -> execute. No discretionary
///         hand, and the immutable treasury rate-limit still caps any outflow.
contract BitchanGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorTimelockControl {
    BitchanRepublic public immutable republic;

    constructor(BitchanRepublic _republic, TimelockController _timelock)
        Governor("BitchanGovernor")
        GovernorSettings(1 /* voting delay (s) */, uint32(1 weeks) /* voting period */, 1 /* proposer must be a citizen */)
        GovernorTimelockControl(_timelock)
    {
        republic = _republic;
    }

    // ── Time-based clock (citizens age by time, not blocks) ──────────────────
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    // ── The heart: one vote per eligible citizen at the snapshot, never per token.
    //    This single line is the wall between bitchan and a token-weighted DAO.
    function _getVotes(address account, uint256 timepoint, bytes memory) internal view override returns (uint256) {
        uint64 reg = republic.registeredAt(account);
        if (!republic.isCitizen(account) || reg == 0) return 0;
        return uint256(reg) + republic.ageThreshold() <= timepoint ? 1 : 0;
    }

    // ── Quorum: 25% of citizens must weigh in ────────────────────────────────
    function quorum(uint256) public view override returns (uint256) {
        return republic.citizenCount() / 4;
    }

    // ── A 2/3 supermajority of decisive (For + Against) votes to pass ────────
    function _voteSucceeded(uint256 proposalId) internal view override(Governor, GovernorCountingSimple) returns (bool) {
        (uint256 against, uint256 forVotes,) = proposalVotes(proposalId);
        return forVotes * 3 >= (forVotes + against) * 2;
    }

    // ── Required multiple-inheritance plumbing ───────────────────────────────
    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
