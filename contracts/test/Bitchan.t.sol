// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Bitchan} from "../src/Bitchan.sol";

contract BitchanTest is Test {
    Bitchan internal bc;

    address internal president = address(0xB055);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    uint256 internal constant FEE = 0.001 ether;

    function setUp() public {
        bc = new Bitchan(president, FEE);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    // --- posting ---

    function test_Post_emitsAndCharges() public {
        vm.expectEmit(true, true, true, true);
        emit Bitchan.Posted(1, alice, 0, 0, bytes32(0), "gm", block.timestamp);

        vm.prank(alice);
        uint256 id = bc.post{value: FEE}("gm", bytes32(0), 0, 0);

        assertEq(id, 1);
        assertEq(bc.treasury(), FEE);
        assertEq(bc.nextPostId(), 2);
    }

    function test_Post_overpayGoesToTreasury() public {
        vm.prank(alice);
        bc.post{value: 1 ether}("rich", bytes32(0), 0, 0);
        assertEq(bc.treasury(), 1 ether);
    }

    function test_Post_revertsBelowFee() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Bitchan.FeeNotMet.selector, FEE, 0));
        bc.post("hi", bytes32(0), 0, 0);
    }

    function test_Post_revertsWhenEmpty() public {
        vm.prank(alice);
        vm.expectRevert(Bitchan.EmptyPost.selector);
        bc.post{value: FEE}("", bytes32(0), 0, 0);
    }

    function test_Post_allowsEmptyTextWithMedia() public {
        bytes32 txid = keccak256("arweave-txid");
        vm.prank(alice);
        uint256 id = bc.post{value: FEE}("", txid, 0, 0);
        assertEq(id, 1);
    }

    function test_Post_replyAndQuote() public {
        vm.prank(alice);
        uint256 root = bc.post{value: FEE}("root", bytes32(0), 0, 0);

        vm.expectEmit(true, true, true, true);
        emit Bitchan.Posted(2, bob, root, root, bytes32(0), "reply+quote", block.timestamp);
        vm.prank(bob);
        bc.post{value: FEE}("reply+quote", bytes32(0), root, root);
    }

    // --- engagement ---

    function test_Like_emits() public {
        vm.expectEmit(true, true, false, false);
        emit Bitchan.Liked(1, alice);
        vm.prank(alice);
        bc.like(1);
    }

    function test_Follow_emits() public {
        vm.expectEmit(true, true, false, false);
        emit Bitchan.Followed(alice, bob);
        vm.prank(alice);
        bc.follow(bob);
    }

    // --- identity ---

    function test_SetHandle() public {
        vm.expectEmit(true, false, false, true);
        emit Bitchan.HandleSet(alice, "satoshi");
        vm.prank(alice);
        bc.setHandle("satoshi");
        assertEq(bc.handleOf(alice), "satoshi");
    }

    function test_SetHandle_revertsWhenTaken() public {
        vm.prank(alice);
        bc.setHandle("satoshi");

        vm.prank(bob);
        vm.expectRevert(Bitchan.HandleTaken.selector);
        bc.setHandle("satoshi");
    }

    function test_SetHandle_revertsWhenEmpty() public {
        vm.prank(alice);
        vm.expectRevert(Bitchan.InvalidHandle.selector);
        bc.setHandle("");
    }

    function test_SetHandle_ownerCanReclaimOwn() public {
        vm.startPrank(alice);
        bc.setHandle("satoshi");
        bc.setHandle("satoshi"); // no revert: same owner
        vm.stopPrank();
        assertEq(bc.handleOf(alice), "satoshi");
    }

    // --- moderation / admin gating ---

    function test_Hide_onlyPresident() public {
        vm.prank(alice);
        vm.expectRevert(Bitchan.NotPresident.selector);
        bc.hide(1, "spam");
    }

    function test_Hide_byPresidentEmits() public {
        vm.expectEmit(true, true, false, true);
        emit Bitchan.Hidden(1, president, "spam");
        vm.prank(president);
        bc.hide(1, "spam");
    }

    function test_SetPostFee_onlyPresident() public {
        vm.prank(alice);
        vm.expectRevert(Bitchan.NotPresident.selector);
        bc.setPostFee(0);
    }

    function test_SetPostFee_byPresident() public {
        vm.prank(president);
        bc.setPostFee(0.5 ether);
        assertEq(bc.postFee(), 0.5 ether);
    }

    function test_SetPresident() public {
        vm.prank(president);
        bc.setPresident(bob);
        assertEq(bc.president(), bob);
    }

    function test_SetPresident_revertsZero() public {
        vm.prank(president);
        vm.expectRevert(Bitchan.ZeroAddress.selector);
        bc.setPresident(address(0));
    }

    // --- treasury ---

    function test_WithdrawTreasury() public {
        vm.prank(alice);
        bc.post{value: FEE}("gm", bytes32(0), 0, 0);

        uint256 before = president.balance;
        vm.prank(president);
        bc.withdrawTreasury(payable(president));

        assertEq(bc.treasury(), 0);
        assertEq(president.balance, before + FEE);
    }

    function test_WithdrawTreasury_revertsWhenEmpty() public {
        vm.prank(president);
        vm.expectRevert(Bitchan.NothingToWithdraw.selector);
        bc.withdrawTreasury(payable(president));
    }

    function test_WithdrawTreasury_onlyPresident() public {
        vm.prank(alice);
        vm.expectRevert(Bitchan.NotPresident.selector);
        bc.withdrawTreasury(payable(alice));
    }

    function test_constructor_defaultsPresidentToDeployer() public {
        Bitchan b2 = new Bitchan(address(0), FEE);
        assertEq(b2.president(), address(this));
    }
}
