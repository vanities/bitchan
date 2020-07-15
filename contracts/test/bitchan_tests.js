const User = artifacts.require("User");
const Bitchan = artifacts.require("Bitchan");

contract("Bitchan test", async (accounts) => {
  it("createThread should increment the thread count", async () => {
    var instance = await User.deployed();
    const account_one = await instance.create.call("some-username")[1];

    instance = await Bitchan.deployed();
    assert.equal(0, await instance.threadCount.call({from: account_one}));
    await instance.createThread.call("some-subject", "some-text", "some-image");
    assert.equal(0, await instance.threadCount.call({from: account_one}));
  });
});
