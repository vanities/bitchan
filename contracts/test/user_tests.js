const User = artifacts.require('User');

contract('User test get num of users', async (accounts) => {
  it('should get the initial num of users', async () => {
    let instance = await User.deployed();
    let count = await instance.getNumUsers.call();
    assert.equal(1, count);
  });
});
