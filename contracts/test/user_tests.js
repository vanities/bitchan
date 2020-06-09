const User = artifacts.require("User");

contract("User test get num of users", async (accounts) => {
  it("should get the initial num of users", async () => {
    const instance = await User.deployed();
    const info = await instance.getState.call();
    console.log(count);
    assert.equal(
      {
        "0": {
          "length": 1
          "negative": 0
          "red": [null]
          "words": [
            1
          ]
        }
        "1": "0x0000000000000000000000000000000000000000"
        "2": ""
      }, info);
  });
});
