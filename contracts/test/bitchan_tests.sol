pragma solidity >=0.4.22 <0.7.0;
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bitchan.sol";

contract TestBitchan{
    address acc0;
    uint id0;
    string username0;
    string ownerUsername;
    uint256 feeOriginalPost;
    uint256 feeReplyPost;
    Bitchan bitchan;

    function beforeAll() public {
        feeOriginalPost = 0;
        feeReplyPost = 0;
        bitchan = new Bitchan(feeOriginalPost, feeReplyPost);
    }

    function testCreateThreadCreatesOriginalPost() public {
        Assert.equal(feeOriginalPost, 0, "0 posts originally");
    }

}
