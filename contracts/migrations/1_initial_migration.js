const Migrations = artifacts.require("Migrations");

// https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations
module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
