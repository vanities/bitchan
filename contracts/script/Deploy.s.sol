// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {Bitchan} from "../src/Bitchan.sol";

/// @notice Deploys Bitchan. Defaults target a local Anvil node:
///   - DEPLOYER_PK   defaults to Anvil account #0
///   - POST_FEE_WEI  defaults to 0.0001 ETH
contract Deploy is Script {
    // Anvil's well-known account #0 (local dev only — never use on a real network).
    uint256 internal constant ANVIL_PK =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external returns (Bitchan bc) {
        uint256 pk = vm.envOr("DEPLOYER_PK", ANVIL_PK);
        uint256 fee = vm.envOr("POST_FEE_WEI", uint256(0.0001 ether));
        address president = vm.addr(pk);

        vm.startBroadcast(pk);
        bc = new Bitchan(president, fee);
        vm.stopBroadcast();

        console2.log("Bitchan deployed at:", address(bc));
        console2.log("president:", president);
        console2.log("postFee (wei):", fee);
    }
}
