pragma solidity >=0.4.22 <0.7.0;
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bitchan.sol";

contract TestBitchan is Bitchan{
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
    Bitchan bitchan;

    function beforeAll() public {
        bitchan = new Bitchan(0, 0);
    }

    function testCreateThreadCreatesOriginalPost() public {
        Assert.equal(0, bitchan.originalPostCount, "0 posts originally");
    }

}
