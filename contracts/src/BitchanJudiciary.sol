// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BitchanRepublic} from "./BitchanRepublic.sol";

/// @title BitchanJudiciary — the right of contest (Constitution Art. X).
/// @notice Any citizen may contest a consequential act by its opaque actionId
///         (the keccak of a Hidden / DoNotServed / Slashed event, an election
///         result, etc.). An independent body — a citizen supermajority — may
///         VOID it: 2/3 of votes cast with a 25% turnout quorum. The chain records
///         only the contest and the verdict; honoring a void (un-hiding a post,
///         re-serving it) is done off-chain by honoring frontends/indexers.
///         One citizen, one vote; no loops.
contract BitchanJudiciary {
    BitchanRepublic public immutable republic;
    uint256 public immutable votePeriod;

    uint8 public constant PENDING = 0;
    uint8 public constant UPHELD = 1;
    uint8 public constant VOIDED = 2;

    struct Contest {
        uint64 deadline; // 0 = not contested
        bool ruled;
        uint8 verdict; // PENDING until ruled
        uint256 voidVotes;
        uint256 totalVotes;
    }

    mapping(bytes32 => Contest) public contests;
    mapping(bytes32 => mapping(address => bool)) public votedOn;

    event Contested(bytes32 indexed actionId, address indexed by);
    event ContestVoted(bytes32 indexed actionId, address indexed voter, bool void_);
    event Ruled(bytes32 indexed actionId, uint8 verdict);

    error NotEligible();
    error AlreadyContested();
    error NotContested();
    error Closed();
    error NotClosed();
    error AlreadyVoted();
    error AlreadyRuled();

    constructor(BitchanRepublic _republic, uint256 _votePeriod) {
        republic = _republic;
        votePeriod = _votePeriod;
    }

    /// @notice Contest a consequential act, opening a citizen review window.
    function contest(bytes32 actionId) external {
        if (!republic.canVote(msg.sender)) revert NotEligible();
        if (contests[actionId].deadline != 0) revert AlreadyContested();
        contests[actionId].deadline = uint64(block.timestamp + votePeriod);
        emit Contested(actionId, msg.sender);
    }

    /// @notice Vote to void (true) or uphold (false) a contested act.
    function castVote(bytes32 actionId, bool void_) external {
        Contest storage c = contests[actionId];
        if (c.deadline == 0) revert NotContested();
        if (block.timestamp > c.deadline) revert Closed();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        if (votedOn[actionId][msg.sender]) revert AlreadyVoted();
        votedOn[actionId][msg.sender] = true;
        c.totalVotes++;
        if (void_) c.voidVotes++;
        emit ContestVoted(actionId, msg.sender, void_);
    }

    /// @notice After the window, record the verdict (VOID needs 2/3 + 25% quorum).
    function rule(bytes32 actionId) external {
        Contest storage c = contests[actionId];
        if (c.deadline == 0) revert NotContested();
        if (block.timestamp <= c.deadline) revert NotClosed();
        if (c.ruled) revert AlreadyRuled();
        c.ruled = true;
        bool quorum = c.totalVotes * 4 >= republic.citizenCount(); // ≥25% turnout
        bool voided = quorum && (c.voidVotes * 3 >= c.totalVotes * 2); // ≥2/3 of votes cast
        c.verdict = voided ? VOIDED : UPHELD;
        emit Ruled(actionId, c.verdict);
    }

    function verdict(bytes32 actionId) external view returns (uint8) {
        return contests[actionId].verdict;
    }
}
