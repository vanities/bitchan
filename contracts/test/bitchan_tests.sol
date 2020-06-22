pragma solidity >=0.4.22 <0.7.0;
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bitchan.sol";

contract TestBitchan{
    address acc0;
    uint id0;
    string username0;
    string ownerUsername;
    uint256 public feeCreateThread;
    uint256 public feeReplyPost;
    Bitchan bitchan;

    function beforeAll() public {
        feeCreateThread = 0;
        feeReplyPost = 0;
        bitchan = new Bitchan(feeCreateThread, feeReplyPost);
    }

    function testCreateThreadCreatesCreateThread() public {
        //Assert.equal(feeCreateThread, bitchan.feeCreateThread, "0 posts originally");
    }
}
