// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BitchanRepublic} from "./BitchanRepublic.sol";

/// @title BitchanElection — a per-citizen plurality election for the presidency.
/// @notice One eligible citizen, one vote (reuses BitchanRepublic.canVote) — never
///         token-weighted. A nomination window, then a voting window; the plurality
///         winner is installed as president via the republic's election hook. The
///         leader is tracked incrementally so there is no unbounded loop anywhere.
contract BitchanElection {
    BitchanRepublic public immutable republic;
    uint256 public immutable nominateUntil;
    uint256 public immutable voteUntil;

    address[] public candidates;
    mapping(address => bool) public isCandidate;
    mapping(address => uint256) public votesFor;
    mapping(address => bool) public hasVoted;

    address public leader;
    uint256 public leaderVotes;
    uint256 public totalVotes;
    bool public finalized;
    address public winner;

    event Nominated(address indexed candidate);
    event Voted(address indexed voter, address indexed candidate);
    event Finalized(address indexed winner, uint256 votes);

    error NotEligible();
    error NotNominating();
    error NotVoting();
    error AlreadyCandidate();
    error AlreadyVoted();
    error UnknownCandidate();
    error VotingOpen();
    error AlreadyFinalized();
    error NoCandidates();
    error BadWindows();

    constructor(BitchanRepublic _republic, uint256 _nominateUntil, uint256 _voteUntil) {
        if (_voteUntil <= _nominateUntil) revert BadWindows();
        republic = _republic;
        nominateUntil = _nominateUntil;
        voteUntil = _voteUntil;
    }

    /// @notice Self-nominate as a presidential candidate (eligible citizens only).
    function nominate() external {
        if (block.timestamp > nominateUntil) revert NotNominating();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        if (isCandidate[msg.sender]) revert AlreadyCandidate();
        isCandidate[msg.sender] = true;
        candidates.push(msg.sender);
        emit Nominated(msg.sender);
    }

    /// @notice Cast your single vote for a nominated candidate.
    function castVote(address candidate) external {
        if (block.timestamp <= nominateUntil || block.timestamp > voteUntil) revert NotVoting();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        if (!isCandidate[candidate]) revert UnknownCandidate();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        hasVoted[msg.sender] = true;
        uint256 v = ++votesFor[candidate];
        totalVotes++;
        if (v > leaderVotes) {
            leaderVotes = v;
            leader = candidate;
        }
        emit Voted(msg.sender, candidate);
    }

    /// @notice After voting closes, install the plurality winner as president.
    function finalize() external {
        if (block.timestamp <= voteUntil) revert VotingOpen();
        if (finalized) revert AlreadyFinalized();
        if (candidates.length == 0) revert NoCandidates();
        address win = leader == address(0) ? candidates[0] : leader; // unopposed/no votes → first
        finalized = true;
        winner = win;
        republic.installPresident(win);
        emit Finalized(win, leaderVotes);
    }

    function candidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice 0 = nomination window, 1 = voting window, 2 = closed.
    function phase() external view returns (uint8) {
        if (block.timestamp <= nominateUntil) return 0;
        if (block.timestamp <= voteUntil) return 1;
        return 2;
    }

    /// @notice Full candidate roster with parallel vote counts (read-only; a view
    ///         loop is fine — it never griefs a state-changing call).
    function tally() external view returns (address[] memory addrs, uint256[] memory votes) {
        addrs = candidates;
        votes = new uint256[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            votes[i] = votesFor[addrs[i]];
        }
    }
}
