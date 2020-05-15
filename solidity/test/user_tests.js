const User = artifacts.require('User');

contract('User test get num of users', async (accounts) => {
  it('should get the num of users', async () => {
    let instance = await User.deployed();
    let count = await instance.getUserCount.call();
    assert.equal(count, 3);
  });
});
