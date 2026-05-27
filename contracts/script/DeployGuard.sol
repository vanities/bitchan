// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Deploy-time safety guards shared by the deploy scripts.
library DeployGuard {
    /// @dev Anvil's well-known account #0 — public knowledge, local dev only.
    uint256 internal constant ANVIL_PK =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    error PublicDeployerKey();

    /// @notice Reverts if deploying to a non-local chain with the public Anvil key —
    ///         that would make the founder/president an address whose private key is
    ///         public knowledge. Set DEPLOYER_PK for any real network.
    function requireRealKey(uint256 pk, uint256 chainId) internal pure {
        if (chainId != 31337 && pk == ANVIL_PK) revert PublicDeployerKey();
    }
}
