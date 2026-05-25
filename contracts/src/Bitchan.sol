// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Bitchan
/// @notice Minimal on-chain social feed — a single global, governed timeline.
///         The chain is an append-only log of social actions; an off-chain
///         indexer (Ponder) materializes timelines, the follow graph and counts.
///         Long text / media live off-chain on Arweave (content-addressed);
///         only a content hash is anchored here. Short text rides in the event.
/// @dev    M0/M1 keeps governance minimal (a single `president`). OpenZeppelin
///         AccessControl (custodian roles) + Governor (elections) arrive at the
///         governance milestone; the events/role seam here is forward-compatible.
contract Bitchan {
    // --- governance (minimal for now) ---
    address public president;

    // --- economics ---
    uint256 public postFee; // wei required to create a post or reply
    uint256 public treasury; // accumulated fees, withdrawable by president

    // --- ids ---
    uint256 public nextPostId = 1;

    // --- optional identity (anonymous by default; claim a handle if you want) ---
    mapping(address => string) public handleOf; // account => handle ("" = anon)
    mapping(bytes32 => address) public ownerOfHandle; // keccak(handle) => account

    // --- events: the indexer's source of truth ---
    event Posted(
        uint256 indexed id,
        address indexed author,
        uint256 indexed parentId, // 0 = top-level
        uint256 quotedId, // 0 = none
        bytes32 mediaHash, // 0x0 = none; otherwise Arweave TXID
        string text, // short body; long text lives off-chain via mediaHash
        uint256 createdAt
    );
    event Liked(uint256 indexed postId, address indexed account);
    event Unliked(uint256 indexed postId, address indexed account);
    event Reposted(uint256 indexed postId, address indexed account);
    event Followed(address indexed follower, address indexed target);
    event Unfollowed(address indexed follower, address indexed target);
    event Hidden(uint256 indexed postId, address indexed by, string reason);
    event Unhidden(uint256 indexed postId, address indexed by);
    event HandleSet(address indexed account, string handle);
    event PostFeeChanged(uint256 newFee);
    event PresidentChanged(address indexed newPresident);
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    // --- errors ---
    error NotPresident();
    error FeeNotMet(uint256 required, uint256 sent);
    error EmptyPost();
    error HandleTaken();
    error InvalidHandle();
    error NothingToWithdraw();
    error WithdrawFailed();
    error ZeroAddress();

    modifier onlyPresident() {
        if (msg.sender != president) revert NotPresident();
        _;
    }

    constructor(address _president, uint256 _postFee) {
        president = _president == address(0) ? msg.sender : _president;
        postFee = _postFee;
        emit PresidentChanged(president);
        emit PostFeeChanged(_postFee);
    }

    // --- posting ---

    /// @notice Create a post, reply (parentId != 0) or quote (quotedId != 0).
    /// @param text       Short body. Empty allowed only if mediaHash is set.
    /// @param mediaHash  Arweave TXID of media/long-form content, or 0x0.
    /// @param parentId   The post being replied to, or 0 for a top-level post.
    /// @param quotedId   The post being quoted, or 0.
    function post(string calldata text, bytes32 mediaHash, uint256 parentId, uint256 quotedId)
        public
        payable
        virtual
        returns (uint256 id)
    {
        if (msg.value < postFee) revert FeeNotMet(postFee, msg.value);
        if (bytes(text).length == 0 && mediaHash == bytes32(0)) revert EmptyPost();
        treasury += msg.value;
        id = nextPostId++;
        emit Posted(id, msg.sender, parentId, quotedId, mediaHash, text, block.timestamp);
    }

    // --- engagement (gas-only, no protocol fee) ---

    function like(uint256 postId) external {
        emit Liked(postId, msg.sender);
    }

    function unlike(uint256 postId) external {
        emit Unliked(postId, msg.sender);
    }

    function repost(uint256 postId) external {
        emit Reposted(postId, msg.sender);
    }

    function follow(address target) external {
        emit Followed(msg.sender, target);
    }

    function unfollow(address target) external {
        emit Unfollowed(msg.sender, target);
    }

    // --- optional identity ---

    /// @notice Claim or change a display handle (like a 4chan name/tripcode).
    ///         Posting never requires a handle; anonymous is the default.
    function setHandle(string calldata handle) external {
        bytes memory b = bytes(handle);
        if (b.length == 0 || b.length > 32) revert InvalidHandle();
        bytes32 key = keccak256(b);
        address current = ownerOfHandle[key];
        if (current != address(0) && current != msg.sender) revert HandleTaken();
        ownerOfHandle[key] = msg.sender;
        handleOf[msg.sender] = handle;
        emit HandleSet(msg.sender, handle);
    }

    // --- moderation (president-only for now; custodian roles land with OZ AccessControl) ---

    function hide(uint256 postId, string calldata reason) external virtual onlyPresident {
        emit Hidden(postId, msg.sender, reason);
    }

    function unhide(uint256 postId) external onlyPresident {
        emit Unhidden(postId, msg.sender);
    }

    // --- admin / treasury ---

    function setPostFee(uint256 newFee) external virtual onlyPresident {
        postFee = newFee;
        emit PostFeeChanged(newFee);
    }

    function setPresident(address newPresident) external onlyPresident {
        if (newPresident == address(0)) revert ZeroAddress();
        president = newPresident;
        emit PresidentChanged(newPresident);
    }

    function withdrawTreasury(address payable to) external virtual onlyPresident {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = treasury;
        if (amount == 0) revert NothingToWithdraw();
        treasury = 0;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit TreasuryWithdrawn(to, amount);
    }
}
