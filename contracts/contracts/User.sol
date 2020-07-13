pragma solidity >=0.4.22 <0.7.0;
/**
 * @title User
 * @dev a CRUD for a user
 * @author vanities
 */
contract User {
    uint256 public userCount = 0;
    struct UserProfile {
        uint id;
        address addr;
        string username;
        bool active;
        bool canVote;
    }

    UserProfile public owner;

    mapping (uint => UserProfile) public users;
    mapping (address => UserProfile) public usersAddress;
    mapping (address => bool) public userMap;

    // modifier to check if caller is owner
    modifier isOwner() {
        require(msg.sender == owner.addr, "Caller is not owner");
        _;
    }

    modifier doesExist() {
        require(exists(), "Caller is not a user");
        _;
    }

    function getState() public view returns (uint256, address, string memory){
      return (userCount, owner.addr, owner.username);
    }

    /**
     * @dev Set contract deployer as owner
     */
    constructor() public {
        create("vanities");
    }

    /**
     * @dev Retrieve
     * @return User tuple
     */
    function retrieve(uint _id) public view returns (uint, address, string memory, bool, bool) {
        return (users[_id].id, users[_id].addr, users[_id].username, users[_id].active, users[_id].canVote);
    }

    /**
     * @dev Create
     * @return User tuple
     */
    function create(string memory _username) public {
        bool active = true;
        bool canVote = true;
        users[userCount] = UserProfile(userCount, msg.sender, _username, active, canVote);
        usersAddress[msg.sender] = UserProfile(userCount, msg.sender, _username, active, canVote);
        incrementUserCount();
        userMap[msg.sender] = true;

    }

    function exists() public view returns (bool) {
      return userMap[msg.sender];
    }

    function incrementUserCount() internal {
        userCount++;
    }
}
