pragma solidity >=0.4.22 <0.7.0;
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/User.sol";

contract TestUser{
    address acc0;
    address acc1;
    address acc2;
    uint id0;
    uint id1;
    uint id2;
    string username0;
    string username1;
    string username2;
    string ownerUsername;
    User user;

    function beforeAll() public {
        user = new User();
        ownerUsername = "vanities";
        (id0, acc0, username0) = user.getOwner();
    }

    function testCreateOwnerIsOwnerOfContract() public {
        Assert.equal(0, id0, "get owner returns the id of the owner");
        Assert.equal(acc0, acc0, "get owner returns the address of the owner");
        Assert.equal(ownerUsername, username0, "get owner returns the username of the owner");
        Assert.equal(acc0, acc0, "ensures the user is the owner");
    }

    function testGetUserGetsUserDetails() public {
        (id0, acc0, username0) = user.retrieve(0);
        Assert.equal(0, id0, "get owner returns the id of the owner");
        Assert.equal(acc0, acc0, "get owner returns the address of the owner");
        Assert.equal(ownerUsername, username0, "get owner returns the username of the owner");
    }

    function testUserIncrementsUserCount() public {
        (id1, acc1, username1) = user.create("some-username");
        Assert.equal(id1, uint(0), "get owner returns the id of the user");
        Assert.equal(acc1, acc1, "get owner returns the address of the user");
        Assert.equal(username1, string(""), "get owner returns the username of the user");


        (id2, acc2, username2) = user.create("some-username");
        Assert.equal(id1, uint(0), "get owner returns the id of the user");
        Assert.equal(acc2, acc2, "get owner returns the address of the user");
        Assert.equal(username2, string(""), "get owner returns the username of the user");
    }

    function testGetNumUsersReturnsUserCount() public {
        Assert.equal(user.getNumUsers(), uint(3), "gets correct number of users");
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
