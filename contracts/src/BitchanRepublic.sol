// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Bitchan} from "./Bitchan.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BitchanRepublic — Phase 1 governance (founding executive + registry)
/// @notice The minimal, non-upgradeable governance core over the social feed:
///         OZ AccessControl roles, a dumb per-citizen franchise predicate, a
///         rate-limited treasury, and the code-enforced Washington transition.
///         Everything clever (sybil/reputation) stays off-chain and may only
///         *recommend*; the chain executes one-liners. See docs/GOVERNANCE_MVP.md.
/// @dev    GOVERNANCE_ROLE is granted to the Phase-2 Timelock; during the founding
///         phase no one holds it, so the governable levers are inert by design.
contract BitchanRepublic is Bitchan, AccessControl, ReentrancyGuard {
    // ── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE");

    // ── Immutable bounds (the non-upgradeable deploy IS the guarantee) ───────
    uint64 public constant AGE_FLOOR = 60 days; // account-age floor to vote
    uint64 public constant AGE_CEIL = 365 days; // ratchets up toward, never past, 1yr
    uint256 public constant LONGSTOP = 730 days; // founding ends regardless after 2yr
    uint256 public constant POST_FEE_FLOOR = 0.00001 ether;
    uint256 public constant MAX_DNS_PER_DAY = 10;
    uint256 public constant DNS_TTL = 30 days;
    uint256 public constant WITHDRAW_WINDOW = 7 days;
    uint256 public constant WITHDRAW_BPS = 1000; // ≤10% of window-start balance / window
    uint256 public constant INVITE_CAP = 5;

    uint256 public immutable T; // citizen target that ends founding
    uint256 public immutable deployedAt;

    // ── Founding (immutable, one-way: nothing ever sets this true again) ─────
    bool public foundingPhase = true;
    address public election; // the Phase-2 election authorized to install the next president

    // ── Citizenship registry — the dumb franchise predicate ──────────────────
    mapping(address => uint64) public registeredAt; // age anchor; set on first interaction
    mapping(address => bool) public isCitizen;
    uint256 public citizenCount;
    uint64 public ageThreshold;
    uint256 public citizenshipCost;

    // ── Invite graph (free path; the release valve) ──────────────────────────
    mapping(address => uint256) public invitesMinted;
    mapping(bytes32 => address) public inviteCreator;
    mapping(bytes32 => bool) public inviteUsed;
    mapping(address => address) public invitedBy;

    // ── do-not-serve (president-only; rate-limited; auto-expiring) ────────────
    mapping(uint256 => uint256) public dnsUntil; // postId => expiry ts
    mapping(uint256 => uint256) private _dnsForDay; // day index => count issued

    // ── Treasury rate-limit window ───────────────────────────────────────────
    uint256 public windowStart;
    uint256 public windowStartBalance;
    uint256 public withdrawnThisWindow;

    // ── Param raise cooldowns (≤2× per 365d) ─────────────────────────────────
    uint256 public postFeeLastRaise;
    uint256 public costLastRaise;

    // ── Events ────────────────────────────────────────────────────────────────
    event CitizenshipClaimed(address indexed who);
    event InviteMinted(address indexed by, bytes32 indexed code);
    event InviteRedeemed(address indexed who, address indexed inviter, bytes32 indexed code);
    event DoNotServed(uint256 indexed postId, address indexed by, string reason, uint256 until);
    event FoundingTransitioned(uint256 atCount, uint256 atTime);
    event ElectionSet(address indexed election);
    event CitizenshipCostChanged(uint256 newCost);
    event AgeThresholdChanged(uint64 newThreshold);
    event Slashed(address indexed who);

    // ── Errors ─────────────────────────────────────────────────────────────────
    error AlreadyCitizen();
    error InsufficientCitizenshipFee();
    error NotCitizen();
    error InviteCapReached();
    error InviteExists();
    error BadInvite();
    error InviteUsed();
    error NotModerator();
    error DnsRateLimited();
    error FoundingActive();
    error FoundingEnded();
    error NotElection();
    error ElectionAlreadySet();
    error TransitionNotReady();
    error RateLimited();
    error BelowFloor();
    error OutOfBounds();
    error UseRateLimitedWithdraw();

    constructor(
        address _president,
        uint256 _postFee,
        uint256 _citizenshipCost,
        uint256 _T,
        address _governance
    ) Bitchan(_president, _postFee) {
        citizenshipCost = _citizenshipCost;
        T = _T;
        deployedAt = block.timestamp;
        ageThreshold = AGE_FLOOR;
        if (_governance != address(0)) _grantRole(GOVERNANCE_ROLE, _governance);
    }

    // ── Citizenship ───────────────────────────────────────────────────────────

    function claimCitizenship() external payable {
        if (isCitizen[msg.sender]) revert AlreadyCitizen();
        if (msg.value < citizenshipCost) revert InsufficientCitizenshipFee();
        treasury += msg.value;
        _register(msg.sender);
        isCitizen[msg.sender] = true;
        citizenCount++;
        emit CitizenshipClaimed(msg.sender);
    }

    function mintInvite(bytes32 code) external {
        if (!isCitizen[msg.sender]) revert NotCitizen();
        if (invitesMinted[msg.sender] >= INVITE_CAP) revert InviteCapReached();
        if (inviteCreator[code] != address(0)) revert InviteExists();
        inviteCreator[code] = msg.sender;
        invitesMinted[msg.sender]++;
        emit InviteMinted(msg.sender, code);
    }

    function redeemInvite(bytes32 code) external {
        address inviter = inviteCreator[code];
        if (inviter == address(0)) revert BadInvite();
        if (inviteUsed[code]) revert InviteUsed();
        if (isCitizen[msg.sender]) revert AlreadyCitizen();
        inviteUsed[code] = true;
        invitedBy[msg.sender] = inviter;
        _register(msg.sender);
        isCitizen[msg.sender] = true;
        citizenCount++;
        emit InviteRedeemed(msg.sender, inviter, code);
    }

    /// @notice The on-chain franchise rule: a dumb, objective predicate.
    function canVote(address a) public view returns (bool) {
        return isCitizen[a] && registeredAt[a] != 0 && block.timestamp - registeredAt[a] >= ageThreshold;
    }

    function _register(address a) internal {
        if (registeredAt[a] == 0) registeredAt[a] = uint64(block.timestamp);
    }

    /// @dev First post anchors account age even before citizenship is claimed.
    function post(string calldata text, bytes32 mediaHash, uint256 parentId, uint256 quotedId)
        public
        payable
        override
        returns (uint256 id)
    {
        _register(msg.sender);
        id = super.post(text, mediaHash, parentId, quotedId);
    }

    // ── Moderation: representative model (president staffs custodians) ────────

    function grantCustodian(address a) external onlyPresident {
        _grantRole(CUSTODIAN_ROLE, a);
    }

    function revokeCustodian(address a) external onlyPresident {
        _revokeRole(CUSTODIAN_ROLE, a);
    }

    function hide(uint256 postId, string calldata reason) external override {
        if (msg.sender != president && !hasRole(CUSTODIAN_ROLE, msg.sender)) revert NotModerator();
        emit Hidden(postId, msg.sender, reason);
    }

    function doNotServe(uint256 postId, string calldata reason) external onlyPresident {
        uint256 day = block.timestamp / 1 days;
        if (_dnsForDay[day] >= MAX_DNS_PER_DAY) revert DnsRateLimited();
        _dnsForDay[day]++;
        uint256 until = block.timestamp + DNS_TTL;
        dnsUntil[postId] = until;
        emit DoNotServed(postId, msg.sender, reason, until);
    }

    // ── The Washington transition (immutable, one-way) ───────────────────────

    function pokeTransition() external {
        if (!foundingPhase) revert FoundingEnded();
        if (citizenCount < T && block.timestamp < deployedAt + LONGSTOP) revert TransitionNotReady();
        foundingPhase = false;
        emit FoundingTransitioned(citizenCount, block.timestamp);
    }

    function abdicate() external onlyPresident {
        if (!foundingPhase) revert FoundingEnded();
        foundingPhase = false;
        emit FoundingTransitioned(citizenCount, block.timestamp);
    }

    // ── Elections handoff (Phase 2) ──────────────────────────────────────────

    /// @notice Wire the election contract once (founder, during setup).
    function setElection(address e) external onlyPresident {
        if (election != address(0)) revert ElectionAlreadySet();
        election = e;
        emit ElectionSet(e);
    }

    /// @notice Install the election winner as president. Only the wired election,
    ///         and only after founding has ended.
    function installPresident(address p) external {
        if (msg.sender != election) revert NotElection();
        if (foundingPhase) revert FoundingActive();
        if (p == address(0)) revert ZeroAddress();
        president = p;
        emit PresidentChanged(p);
    }

    // ── Treasury: governance-gated, rate-limited; base drain-all disabled ────

    function withdraw(address to, uint256 amount) external onlyRole(GOVERNANCE_ROLE) nonReentrant {
        if (foundingPhase) revert FoundingActive();
        if (block.timestamp >= windowStart + WITHDRAW_WINDOW) {
            windowStart = block.timestamp;
            windowStartBalance = treasury;
            withdrawnThisWindow = 0;
        }
        uint256 cap = (windowStartBalance * WITHDRAW_BPS) / 10000;
        if (withdrawnThisWindow + amount > cap) revert RateLimited();
        if (amount > treasury) revert RateLimited();
        withdrawnThisWindow += amount;
        treasury -= amount;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit TreasuryWithdrawn(to, amount);
    }

    function withdrawTreasury(address payable) external override {
        revert UseRateLimitedWithdraw();
    }

    // ── Governable parameters (governance-gated; floored; ≤2×/yr) ────────────

    function setPostFee(uint256 newFee) external override onlyRole(GOVERNANCE_ROLE) {
        if (newFee < POST_FEE_FLOOR) revert BelowFloor();
        if (newFee > postFee) {
            if (newFee > postFee * 2) revert RateLimited();
            if (postFeeLastRaise != 0 && block.timestamp < postFeeLastRaise + 365 days) revert RateLimited();
            postFeeLastRaise = block.timestamp;
        }
        postFee = newFee;
        emit PostFeeChanged(newFee);
    }

    function setCitizenshipCost(uint256 c) external onlyRole(GOVERNANCE_ROLE) {
        if (foundingPhase) revert FoundingActive(); // founder may never raise the gate
        if (c > citizenshipCost) {
            if (c > citizenshipCost * 2) revert RateLimited();
            if (costLastRaise != 0 && block.timestamp < costLastRaise + 365 days) revert RateLimited();
            costLastRaise = block.timestamp;
        }
        citizenshipCost = c;
        emit CitizenshipCostChanged(c);
    }

    function setAgeThreshold(uint64 a) external onlyRole(GOVERNANCE_ROLE) {
        if (a < AGE_FLOOR || a > AGE_CEIL || a < ageThreshold) revert OutOfBounds(); // ratchet up only
        ageThreshold = a;
        emit AgeThresholdChanged(a);
    }

    function slash(address a) external onlyRole(GOVERNANCE_ROLE) {
        if (!isCitizen[a]) revert NotCitizen();
        isCitizen[a] = false;
        citizenCount--;
        emit Slashed(a);
    }
}
