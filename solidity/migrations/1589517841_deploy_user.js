var User = artifacts.require('../contracts/User.sol');

module.exports = function (_deployer) {
  // Use deployer to state migration tasks.
  deployer.deploy(User);
};
