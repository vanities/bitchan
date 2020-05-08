pragma solidity >=0.4.22 <0.7.0;
import "remix_tests.sol"; // injected by remix-tests
///import "remix_accounts.sol";
import "../contracts/User.sol";

contract UserTests is User{
    address acc0;
    address acc1;
    address acc2;
    uint id0;
    uint id1;
    uint id2;
    string username0;
    string username1;
    string username2;
    User user;

    function beforeAll() public {
        user = new User();
    }

    function createOwnerIsOwnerOfContract() public {
        (id0, acc0, username0) = user.retrieve(0); 
        Assert.equal(id0, uint(0), "get owner returns the id of the owner");
        Assert.equal(acc0, acc0, "get owner returns the address of the owner");
        Assert.equal(username0, string(""), "get owner returns the username of the owner");
    }

    function createUserIsNotOwner() public {
        (id1, acc1, username1) = user.create("some-username");
        Assert.equal(id1, uint(0), "get owner returns the id of the user");
        Assert.equal(acc1, acc1, "get owner returns the address of the user");
        Assert.equal(username1, string(""), "get owner returns the username of the user");
        
        
        (id2, acc2, username2) = user.create("some-username");
        Assert.equal(id1, uint(0), "get owner returns the id of the user");
        Assert.equal(acc2, acc2, "get owner returns the address of the user");
        Assert.equal(username2, string(""), "get owner returns the username of the user");
    }
}
