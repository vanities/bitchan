var Bitchan = artifacts.require("../contracts/Bitchan.sol");

module.exports = function (_deployer) {
  // Use deployer to state migration tasks.
  _deployer.deploy(Bitchan, 0, 0);
};
