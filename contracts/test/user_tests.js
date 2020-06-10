const User = artifacts.require("User");

contract("User test get num of users", async (accounts) => {
  it("should get the owner of the address", async () => {
    const instance = await User.deployed();
    const info = await instance.getState.call();
    assert.equal("0x0000000000000000000000000000000000000000", info[1]);
  });
});
