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
    }

    UserProfile public owner;

    // This declares a state variable that
    // stores a `Voter` struct for each possible address.
    mapping(uint => UserProfile) public users;

    // modifier to check if caller is owner
    modifier isOwner() {
        require(msg.sender == owner.addr, "Caller is not owner");
        _;
    }

    function getOwner() public view returns (uint, address, string memory) {
        return retrieve(0);
    }

    function getNumUsers() public view returns (uint) {
        return userCount;
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
    function retrieve(uint _id) public view returns (uint, address, string memory) {
        return (users[_id].id, users[_id].addr, users[_id].username);
    }

    /**
     * @dev Create
     * @return User tuple
     */
    function create(string memory _username) public returns(uint, address, string memory) {
        users[userCount] = UserProfile(userCount, msg.sender, _username);
        incrementUserCount();
        return (users[userCount].id, users[userCount].addr, users[userCount].username);

    }

    function incrementUserCount() internal {
        userCount++;
    }
}
