// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";
import {BitchanGovernor} from "../src/BitchanGovernor.sol";
import {BitchanJudiciary} from "../src/BitchanJudiciary.sol";
import {BitchanElections} from "../src/BitchanElections.sol";
import {DeployGuard} from "./DeployGuard.sol";

/// @notice Deploys + wires the full persistent governance stack:
///   Timelock -> Republic(governance = timelock) -> Governor -> Judiciary.
///   The Governor proposes/cancels; anyone may execute after the delay; the
///   deployer's timelock admin is renounced so the timelock is self-governing.
///   Elections and recalls are per-instance and deployed on demand (seed scripts
///   / governance), not here.
///
/// Env (all optional; defaults target local Anvil):
///   DEPLOYER_PK · POST_FEE_WEI · CITIZENSHIP_WEI · CITIZEN_TARGET · TIMELOCK_DELAY
contract DeployAll is Script {
    function run()
        external
        returns (
            BitchanRepublic republic,
            BitchanGovernor governor,
            BitchanJudiciary judiciary,
            TimelockController timelock,
            BitchanElections elections
        )
    {
        uint256 pk = vm.envOr("DEPLOYER_PK", DeployGuard.ANVIL_PK);
        DeployGuard.requireRealKey(pk, block.chainid);
        uint256 fee = vm.envOr("POST_FEE_WEI", uint256(0.0001 ether));
        uint256 cost = vm.envOr("CITIZENSHIP_WEI", uint256(0.003 ether));
        uint256 t = vm.envOr("CITIZEN_TARGET", uint256(10));
        uint256 minDelay = vm.envOr("TIMELOCK_DELAY", uint256(2 days));
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        address[] memory none = new address[](0);
        timelock = new TimelockController(minDelay, none, none, deployer);
        republic = new BitchanRepublic(deployer, fee, cost, t, address(timelock));
        governor = new BitchanGovernor(republic, timelock);
        judiciary = new BitchanJudiciary(republic, 3 days);

        // Recurring annual elections, wired once (deployer is president during setup).
        elections = new BitchanElections(republic);
        republic.setElection(address(elections));

        // The Governor proposes & cancels; anyone may execute once the delay elapses.
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));
        // Hand the timelock to itself — from here only governance can change its roles.
        timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), deployer);

        vm.stopBroadcast();

        console2.log("Bitchan deployed at:", address(republic)); // dev.sh greps this line
        console2.log("timelock:", address(timelock));
        console2.log("governor:", address(governor));
        console2.log("judiciary:", address(judiciary));
        console2.log("elections:", address(elections));
        console2.log("president (founder):", deployer);
    }
}
