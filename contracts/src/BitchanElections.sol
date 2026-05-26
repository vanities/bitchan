// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BitchanRepublic} from "./BitchanRepublic.sol";
import {BokkyPooBahsDateTimeLibrary as DT} from "BokkyPooBahsDateTimeLibrary/contracts/BokkyPooBahsDateTimeLibrary.sol";

/// @title BitchanElections — recurring, calendar-driven presidential elections.
/// @notice One automatic election per year, no per-instance redeploy: nomination
///         runs Dec 18–24, voting Dec 25–31, inauguration Jan 1. One eligible
///         citizen, one vote (reuses BitchanRepublic.canVote) — never token-weighted.
///         Wired into the republic once via setElection; it installs each year's
///         winner. Calendar math uses the vendored, well-tested BokkyPooBah library
///         rather than hand-rolled leap-year logic.
///
///         Scope: the regular annual cadence. The special first election (triggered
///         at the citizen threshold T) is a separate founding-transition concern.
contract BitchanElections {
    BitchanRepublic public immutable republic;

    // The window, as UTC days in December. Inauguration is Jan 1 of the next year.
    uint256 internal constant NOMINATE_FROM_DAY = 18;
    uint256 internal constant VOTE_FROM_DAY = 25;

    // One election per calendar year, keyed by the year of its December.
    struct Cycle {
        address[] candidates;
        mapping(address => bool) isCandidate;
        mapping(address => uint256) votesFor;
        mapping(address => bool) hasVoted;
        address leader;
        uint256 leaderVotes;
        uint256 totalVotes;
        bool finalized;
        address winner;
    }

    mapping(uint256 => Cycle) private cycles;

    event Nominated(uint256 indexed year, address indexed candidate);
    event Voted(uint256 indexed year, address indexed voter, address indexed candidate);
    event Finalized(uint256 indexed year, address indexed winner, uint256 votes);

    error NotEligible();
    error NotNominating();
    error NotVoting();
    error AlreadyCandidate();
    error AlreadyVoted();
    error UnknownCandidate();
    error NotClosed();
    error AlreadyFinalized();
    error NoCandidates();
    error FoundingActive();

    constructor(BitchanRepublic _republic) {
        republic = _republic;
    }

    /// @notice 0 = nominating (Dec 18–24), 1 = voting (Dec 25–31), 2 = closed.
    function phase() public view returns (uint8) {
        (, uint256 month, uint256 day) = DT.timestampToDate(block.timestamp);
        if (month != 12) return 2;
        if (day >= VOTE_FROM_DAY) return 1;
        if (day >= NOMINATE_FROM_DAY) return 0;
        return 2;
    }

    /// @notice The calendar year of the current (or current December's) election.
    function currentYear() public view returns (uint256 year) {
        (year,,) = DT.timestampToDate(block.timestamp);
    }

    /// @notice Self-nominate for this year's election (eligible citizens only).
    function nominate() external {
        if (republic.foundingPhase()) revert FoundingActive();
        if (phase() != 0) revert NotNominating();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        Cycle storage c = cycles[currentYear()];
        if (c.isCandidate[msg.sender]) revert AlreadyCandidate();
        c.isCandidate[msg.sender] = true;
        c.candidates.push(msg.sender);
        emit Nominated(currentYear(), msg.sender);
    }

    /// @notice Cast your single vote for a nominated candidate.
    function castVote(address candidate) external {
        if (phase() != 1) revert NotVoting();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        Cycle storage c = cycles[currentYear()];
        if (!c.isCandidate[candidate]) revert UnknownCandidate();
        if (c.hasVoted[msg.sender]) revert AlreadyVoted();
        c.hasVoted[msg.sender] = true;
        uint256 v = ++c.votesFor[candidate];
        c.totalVotes++;
        if (v > c.leaderVotes) {
            c.leaderVotes = v;
            c.leader = candidate;
        }
        emit Voted(currentYear(), msg.sender, candidate);
    }

    /// @notice After year `y`'s window closes (on/after Jan 1 of y+1), install its
    ///         plurality winner as president. Reverts during founding (the republic
    ///         rejects installPresident until founding ends).
    function finalize(uint256 y) external {
        if (block.timestamp < DT.timestampFromDate(y + 1, 1, 1)) revert NotClosed();
        Cycle storage c = cycles[y];
        if (c.finalized) revert AlreadyFinalized();
        if (c.candidates.length == 0) revert NoCandidates();
        address win = c.leader == address(0) ? c.candidates[0] : c.leader; // unopposed/no votes → first
        c.finalized = true;
        c.winner = win;
        republic.installPresident(win);
        emit Finalized(y, win, c.leaderVotes);
    }

    // ── views ─────────────────────────────────────────────────────────────────

    function candidates(uint256 y) external view returns (address[] memory) {
        return cycles[y].candidates;
    }

    /// @notice Full roster with parallel vote counts (read-only loop; never griefs).
    function tally(uint256 y) external view returns (address[] memory addrs, uint256[] memory votes) {
        addrs = cycles[y].candidates;
        votes = new uint256[](addrs.length);
        for (uint256 i = 0; i < addrs.length; i++) {
            votes[i] = cycles[y].votesFor[addrs[i]];
        }
    }

    function winnerOf(uint256 y) external view returns (address) {
        return cycles[y].winner;
    }

    function finalizedOf(uint256 y) external view returns (bool) {
        return cycles[y].finalized;
    }

    function votesOf(uint256 y, address candidate) external view returns (uint256) {
        return cycles[y].votesFor[candidate];
    }

    function hasVoted(uint256 y, address voter) external view returns (bool) {
        return cycles[y].hasVoted[voter];
    }
}
