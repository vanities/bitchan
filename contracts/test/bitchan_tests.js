const Bitchan = artifacts.require("Bitchan");

contract("Bitchan test", async (accounts) => {
  it("createThread should increment the thread count", async () => {
    const instance = await Bitchan.deployed();
    assert.equal(0, await instance.threadCount.call());
    await instance.createThread.call("some-subject", "some-text", "some-image");
    assert.equal(0, await instance.threadCount.call());
  });
});
