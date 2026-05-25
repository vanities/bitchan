// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";

/// @dev Drives random sequences of citizen actions, then asserts the core
///      guarantees hold over *all* of them.
contract Handler is Test {
    BitchanRepublic public r;
    address[4] internal actors = [address(0xA1), address(0xA2), address(0xA3), address(0xA4)];
    uint256 public created; // distinct citizens minted
    bool public sawEnded; // observed founding end at least once

    constructor(BitchanRepublic _r) {
        r = _r;
    }

    function _actor(uint256 s) internal view returns (address) {
        return actors[s % actors.length];
    }

    function claim(uint256 s) public {
        address a = _actor(s);
        if (r.isCitizen(a)) return;
        vm.deal(a, 1 ether);
        vm.prank(a);
        try r.claimCitizenship{value: r.citizenshipCost()}() {
            created++;
        } catch {}
    }

    function postSomething(uint256 s) public {
        address a = _actor(s);
        vm.deal(a, 1 ether);
        vm.prank(a);
        try r.post{value: r.postFee()}("x", bytes32(0), 0, 0) {} catch {}
    }

    function warp(uint256 dt) public {
        vm.warp(block.timestamp + bound(dt, 1, 800 days));
    }

    function poke() public {
        try r.pokeTransition() {} catch {}
        if (!r.foundingPhase()) sawEnded = true;
    }

    function abdicate() public {
        vm.prank(r.president());
        try r.abdicate() {} catch {}
        if (!r.foundingPhase()) sawEnded = true;
    }
}

contract BitchanRepublicInvariants is StdInvariant, Test {
    BitchanRepublic internal r;
    Handler internal h;

    function setUp() public {
        r = new BitchanRepublic(address(this), 0.001 ether, 0.003 ether, 5, address(0));
        h = new Handler(r);

        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = Handler.claim.selector;
        selectors[1] = Handler.postSomething.selector;
        selectors[2] = Handler.warp.selector;
        selectors[3] = Handler.poke.selector;
        selectors[4] = Handler.abdicate.selector;
        targetSelector(FuzzSelector({addr: address(h), selectors: selectors}));
        targetContract(address(h));
    }

    /// Once founding ends, it can never resume (the Washington guarantee).
    function invariant_foundingIsOneWay() public view {
        if (h.sawEnded()) assertFalse(r.foundingPhase());
    }

    /// No phantom citizens: the registry count equals the citizens actually minted.
    function invariant_citizenCountMatchesCreated() public view {
        assertEq(r.citizenCount(), h.created());
    }

    /// The treasury accounting can never exceed the contract's actual balance —
    /// the founder cannot conjure or withdraw funds during founding.
    function invariant_treasurySolvent() public view {
        assertLe(r.treasury(), address(r).balance);
    }
}
