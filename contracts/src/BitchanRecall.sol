// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BitchanRepublic} from "./BitchanRepublic.sol";

/// @title BitchanRecall — per-citizen recall of a sitting president (Art. V).
/// @notice A 20% petition opens a removal vote; the vote passes at 2/3 of votes
///         cast with a 25% turnout quorum. A 60%-of-eligible petition bypasses the
///         quorum (the anti-suppression valve). Thresholds are measured against the
///         on-chain citizen registry; only eligible citizens (canVote) may sign or
///         vote. On success the president is removed via the republic's recall hook.
///         No loops — all tallies are O(1) per action.
contract BitchanRecall {
    BitchanRepublic public immutable republic;
    address public immutable target; // the president this recall is aimed at
    uint256 public immutable petitionUntil;
    uint256 public immutable voteUntil;

    mapping(address => bool) public petitioned;
    uint256 public petitionCount;
    mapping(address => bool) public voted;
    uint256 public removeVotes;
    uint256 public totalVotes;
    bool public finalized;
    bool public removed;

    event Petitioned(address indexed citizen);
    event RecallVoted(address indexed citizen, bool remove);
    event Finalized(bool removed, uint256 removeVotes, uint256 totalVotes);

    error NotEligible();
    error NotPetitioning();
    error NotVoting();
    error AlreadyPetitioned();
    error AlreadyVoted();
    error PetitionNotMet();
    error VotingOpen();
    error AlreadyFinalized();
    error BadWindows();

    constructor(BitchanRepublic _republic, address _target, uint256 _petitionUntil, uint256 _voteUntil) {
        if (_voteUntil <= _petitionUntil) revert BadWindows();
        republic = _republic;
        target = _target;
        petitionUntil = _petitionUntil;
        voteUntil = _voteUntil;
    }

    /// @notice ≥20% of citizens signed (petitionCount/citizenCount ≥ 1/5).
    function petitionMet() public view returns (bool) {
        return petitionCount * 5 >= republic.citizenCount();
    }

    /// @notice ≥60% of citizens signed → the turnout quorum is waived.
    function quorumBypass() public view returns (bool) {
        return petitionCount * 5 >= republic.citizenCount() * 3;
    }

    function signPetition() external {
        if (block.timestamp > petitionUntil) revert NotPetitioning();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        if (petitioned[msg.sender]) revert AlreadyPetitioned();
        petitioned[msg.sender] = true;
        petitionCount++;
        emit Petitioned(msg.sender);
    }

    function castVote(bool remove_) external {
        if (block.timestamp <= petitionUntil || block.timestamp > voteUntil) revert NotVoting();
        if (!petitionMet()) revert PetitionNotMet();
        if (!republic.canVote(msg.sender)) revert NotEligible();
        if (voted[msg.sender]) revert AlreadyVoted();
        voted[msg.sender] = true;
        totalVotes++;
        if (remove_) removeVotes++;
        emit RecallVoted(msg.sender, remove_);
    }

    function finalize() external {
        if (block.timestamp <= voteUntil) revert VotingOpen();
        if (finalized) revert AlreadyFinalized();
        finalized = true;
        // turnout quorum (≥25%) unless a 60% petition waived it
        bool quorum = quorumBypass() || (totalVotes * 4 >= republic.citizenCount());
        // 2/3 of votes cast to remove
        bool passed = petitionMet() && quorum && (removeVotes * 3 >= totalVotes * 2);
        if (passed) {
            removed = true;
            republic.removePresident();
        }
        emit Finalized(passed, removeVotes, totalVotes);
    }
}
