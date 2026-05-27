// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {DeployGuard} from "../script/DeployGuard.sol";

// External wrapper so vm.expectRevert can observe the (internal, inlined) guard.
contract GuardHarness {
    function check(uint256 pk, uint256 chainId) external pure {
        DeployGuard.requireRealKey(pk, chainId);
    }
}

contract DeployGuardTest is Test {
    GuardHarness internal h = new GuardHarness();

    function test_allowsAnvilKeyOnLocalChain() public {
        h.check(DeployGuard.ANVIL_PK, 31337); // local dev — fine
    }

    function test_allowsRealKeyOffLocal() public {
        h.check(uint256(0xBEEF), 11155111); // a real key on Sepolia — fine
    }

    function test_revertsOnPublicAnvilKeyOffLocal() public {
        // Deploying to a funded chain with the public Anvil key would make the
        // founder/president an address whose key everyone knows.
        vm.expectRevert(DeployGuard.PublicDeployerKey.selector);
        h.check(DeployGuard.ANVIL_PK, 11155111);
    }
}
