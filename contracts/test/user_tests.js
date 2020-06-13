const User = artifacts.require("User");

contract("User test get num of users", async (accounts) => {
  it("should get the owner of the address", async () => {
    const instance = await User.deployed();
    const info = await instance.getState.call();
    assert.equal("0x0000000000000000000000000000000000000000", info[1]);
  });
  it("should create a user", async () => {
    const instance = await User.deployed();
    console.log(instance);
    assert.equal(1, await instance.userCount());
    await instance.create.call("username");
    assert.equal(2, await instance.userCount());
  });
});
