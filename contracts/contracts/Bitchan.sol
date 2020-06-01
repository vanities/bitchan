/**
 * @title Bitchan
 * @dev message board republic
 * @author vanities
 * @notice thanks to: https://etherscan.io/address/0x470fb19D08c3d2eB8923A31d1408c393Dab09ccF#code
 */

pragma solidity >=0.4.22 <0.7.0;

contract Bitchan {

	address payable private owner;

	uint256 public feeOriginalPost;
	uint256 public feeReplyPost;

	struct thread {
		string text;
		string imageUrl;

		uint256 indexLastReply;
		uint256 indexFirstReply;

		uint256 timestamp;
	}
	mapping (uint256 => thread) public threads;
	uint256 public originalPostCount = 0;

	struct reply {
		string text;
		string imageUrl;

		uint256 replyTo;
		uint256 nextReply;

		uint256 timestamp;
	}
	mapping (uint256 => reply) public replies;
	uint256 public indexReplies = 0;

	// last 20 active threads
	uint256[20] public lastThreads;
	uint256 public indexLastThreads = 0; // the index of the thread that was added last in lastThreads

	//
	// Events
	//

	event originalPostEvent(uint256 threadId, string text, string imageUrl, uint256 timestamp);

	event newReplyEvent(uint256 replyId, uint256 replyTo, string text, string imageUrl, uint256 timestamp);

	//
	// Meta
	//

	constructor(uint256 _feeOriginalPost, uint256 _feeReplyPost) public {
		owner = msg.sender;
		feeOriginalPost = _feeOriginalPost;
		feeReplyPost = _feeReplyPost;
	}

	// modifying the fees
	function setFees(uint256 _feeOriginalPost, uint256 _feeReplyPost) public {
		require(owner == msg.sender);
		feeOriginalPost = _feeOriginalPost;
		feeReplyPost = _feeReplyPost;
	}

	// To get the money back
	function withdraw(uint256 amount) public {
		owner.transfer(amount);
	}

	//
	// Core
	//

	// To create a Thread
	function createThread(string memory _text, string memory _imageUrl) payable public {
		// collect the fees
		require(msg.value >= feeOriginalPost);
		// calculate a new thread ID and post
		threads[originalPostCount] = thread(_text, _imageUrl, 0, 0, now);
		// add it to our last active threads array
		lastThreads[indexLastThreads] = originalPostCount;
		indexLastThreads = addmod(indexLastThreads, 1, 20); // increment index
		// log!
		emit originalPostEvent(originalPostCount, _text, _imageUrl, now);
		// increment index for next thread
		originalPostCount += 1;
	}

	// To reply to a thread
	function replyPost(uint256 _replyTo, string memory _text, string memory _imageUrl)  payable public {
		// collect the fees
		require(msg.value >= feeReplyPost);
		// make sure you can't reply to an inexistant thread
		require(_replyTo < originalPostCount && _replyTo > 0);
		// post the reply with nextReply = 0 (this is the last message in the chain)
		replies[indexReplies] = reply(_text, _imageUrl, _replyTo, 0, now);
		// update the thread
		if(threads[_replyTo].indexFirstReply == 0){// we're first
			threads[_replyTo].indexFirstReply = indexReplies;
			threads[_replyTo].indexLastReply = indexReplies;
		}
		else { // we're not first so we update the previous reply as well
			replies[threads[_replyTo].indexLastReply].nextReply = indexReplies;
			threads[_replyTo].indexLastReply = indexReplies;
		}
		// update the last active threads
		for (uint8 i = 0; i < 20; i++) {
			if(lastThreads[i] == _replyTo) {
				break; // already in the list
			}
			if(i == 19) {
				lastThreads[indexLastThreads] = _replyTo;
				indexLastThreads = addmod(indexLastThreads, 1, 20);
			}
		}
		// log!
		emit newReplyEvent(indexReplies, _replyTo, _text, _imageUrl, now);
		// increment index for next reply
		indexReplies += 1;
	}
}
