const User = artifacts.require("User");

contract("User test", async (accounts) => {
  it("should get the owner of the address", async () => {
    const instance = await User.deployed();
    const info = await instance.getState.call();
    assert.equal("0x0000000000000000000000000000000000000000", info[1]);
  });

  it("should retrieve an address", async () => {
    const instance = await User.deployed();
    const owner = await instance.retrieve.call(0);
    delete owner["0"];
    assert.deepEqual(
      {
        "1": "0x96afb074FBF48A2b12e31D5f1aB2112d7643801B",
        "2": "vanities",
        "3": true,
        "4": true,
      },
      owner
    );
  });

  it("should create a user", async () => {
    const instance = await User.deployed();
    assert.equal(1, await instance.userCount());
    await instance.create.call("some-username");
    assert.equal(1, await instance.userCount()); // TODO: fix
  });
});
