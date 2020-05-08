pragma solidity >=0.4.22 <0.7.0;

/**
 * @title User
 * @dev a CRUD for a user
 * @author vanities
 */
contract User {
    uint256 public userCount = 0;
    address private owner;

    struct UserProfile {
        uint id;
        address owner;
        string username;
    }
    
    // This declares a state variable that
    // stores a `Voter` struct for each possible address.
    mapping(uint => UserProfile) public users;
    
    // modifier to check if caller is owner
    modifier isOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }
    
    /**
     * @dev Set contract deployer as owner
     */
    constructor() public {
        owner = msg.sender;
    }

    /**
     * @dev Retrieve
     * @return User tuple
     */
    function retrieve(uint _id) public view returns (uint, address, string memory) {
        return (users[_id].id, users[_id].owner, users[_id].username);
    }

    /**
     * @dev Create
     * @return User tuple
     */
    function create(string memory _username) public returns(uint, address, string memory) {
        users[userCount] = UserProfile(userCount, owner, _username);
        incrementUserCount();
        return (users[userCount].id, users[userCount].owner, users[userCount].username);

    }

    function incrementUserCount() internal {
        userCount++;
    }
}
