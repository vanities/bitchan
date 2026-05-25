// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";

/// @notice Deploys BitchanRepublic (the social feed + Phase-1 governance core).
///   Defaults target a local Anvil node:
///   - DEPLOYER_PK        defaults to Anvil account #0 (also the Founding President)
///   - POST_FEE_WEI       defaults to 0.0001 ETH
///   - CITIZENSHIP_WEI    defaults to 0.003 ETH
///   - CITIZEN_TARGET (T) defaults to 10 (small, so the founding bar is legible locally)
///   - GOVERNANCE         defaults to address(0) — no GOVERNANCE_ROLE holder during founding
contract Deploy is Script {
    // Anvil's well-known account #0 (local dev only — never use on a real network).
    uint256 internal constant ANVIL_PK =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external returns (BitchanRepublic bc) {
        uint256 pk = vm.envOr("DEPLOYER_PK", ANVIL_PK);
        uint256 fee = vm.envOr("POST_FEE_WEI", uint256(0.0001 ether));
        uint256 cost = vm.envOr("CITIZENSHIP_WEI", uint256(0.003 ether));
        uint256 t = vm.envOr("CITIZEN_TARGET", uint256(10));
        address governance = vm.envOr("GOVERNANCE", address(0));
        address president = vm.addr(pk);

        vm.startBroadcast(pk);
        bc = new BitchanRepublic(president, fee, cost, t, governance);
        vm.stopBroadcast();

        console2.log("Bitchan deployed at:", address(bc));
        console2.log("president:", president);
        console2.log("postFee (wei):", fee);
        console2.log("citizenshipCost (wei):", cost);
        console2.log("citizen target T:", t);
    }
}
