// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Bitchan} from "../src/Bitchan.sol";
import {BitchanRepublic} from "../src/BitchanRepublic.sol";

/// @dev Phase-1 governance: every test asserts a constitutional guarantee or a
///      threat-model claim — never a getter for its own sake.
contract BitchanRepublicTest is Test {
    BitchanRepublic internal r;

    address internal president = address(0xB055);
    address internal gov = address(0x60F); // Phase-2 Timelock stand-in (GOVERNANCE_ROLE)
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);

    uint256 internal constant FEE = 0.001 ether;
    uint256 internal constant COST = 0.003 ether;
    uint256 internal constant T = 3; // tiny target so the transition is testable

    function setUp() public {
        r = new BitchanRepublic(president, FEE, COST, T, gov);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);
        vm.warp(365 days); // start at a sane timestamp, not 1
    }

    function _claim(address who) internal {
        vm.prank(who);
        r.claimCitizenship{value: COST}();
    }

    // ─── Citizenship & the franchise predicate ──────────────────────────────

    function test_claim_makesCitizenAndFundsTreasury() public {
        uint256 t0 = r.treasury();
        _claim(alice);
        assertTrue(r.isCitizen(alice));
        assertEq(r.citizenCount(), 1);
        assertEq(r.treasury(), t0 + COST);
        assertEq(r.registeredAt(alice), uint64(block.timestamp));
    }

    function test_claim_revertsBelowCost() public {
        vm.prank(alice);
        vm.expectRevert(BitchanRepublic.InsufficientCitizenshipFee.selector);
        r.claimCitizenship{value: COST - 1}();
    }

    function test_claim_revertsIfAlready() public {
        _claim(alice);
        vm.prank(alice);
        vm.expectRevert(BitchanRepublic.AlreadyCitizen.selector);
        r.claimCitizenship{value: COST}();
    }

    function test_firstPost_anchorsAccountAge() public {
        vm.prank(alice);
        r.post{value: FEE}("gm", bytes32(0), 0, 0);
        assertEq(r.registeredAt(alice), uint64(block.timestamp), "first post anchors age");
    }

    function test_canVote_requiresCitizenAndAge() public {
        _claim(alice);
        assertFalse(r.canVote(alice), "fresh citizen cannot vote");
        vm.warp(block.timestamp + r.ageThreshold());
        assertTrue(r.canVote(alice), "aged citizen can vote");
        assertFalse(r.canVote(bob), "non-citizen never votes");
    }

    // ─── The free invite path (release valve) ───────────────────────────────

    function test_invite_freePathMakesCitizen() public {
        _claim(alice);
        vm.prank(alice);
        r.mintInvite(keccak256("code-1"));

        vm.prank(bob);
        r.redeemInvite(keccak256("code-1"));

        assertTrue(r.isCitizen(bob), "invited user is a citizen, for free");
        assertEq(r.invitedBy(bob), alice, "invite graph records the inviter");
    }

    function test_invite_nonCitizenCannotMint() public {
        vm.prank(alice); // not a citizen
        vm.expectRevert(BitchanRepublic.NotCitizen.selector);
        r.mintInvite(keccak256("x"));
    }

    function test_invite_cannotReuse() public {
        _claim(alice);
        vm.prank(alice);
        r.mintInvite(keccak256("code-1"));
        vm.prank(bob);
        r.redeemInvite(keccak256("code-1"));
        vm.prank(carol);
        vm.expectRevert(BitchanRepublic.InviteUsed.selector);
        r.redeemInvite(keccak256("code-1"));
    }

    // ─── Representative moderation: president staffs custodians ──────────────

    function test_president_grantsCustodianWhoCanHide() public {
        vm.prank(president);
        r.grantCustodian(bob);
        assertTrue(r.hasRole(r.CUSTODIAN_ROLE(), bob));

        vm.expectEmit(true, true, false, true);
        emit Bitchan.Hidden(7, bob, "spam");
        vm.prank(bob);
        r.hide(7, "spam");
    }

    function test_hide_rejectsNonModerator() public {
        vm.prank(alice);
        vm.expectRevert(BitchanRepublic.NotModerator.selector);
        r.hide(7, "spam");
    }

    function test_onlyPresidentGrantsCustodians() public {
        vm.prank(alice);
        vm.expectRevert(); // not the president
        r.grantCustodian(bob);
    }

    function test_doNotServe_setsExpiryAndIsPresidentOnly() public {
        vm.prank(president);
        r.doNotServe(7, "DMCA");
        assertEq(r.dnsUntil(7), block.timestamp + r.DNS_TTL());

        vm.prank(alice);
        vm.expectRevert(Bitchan.NotPresident.selector);
        r.doNotServe(8, "x");
    }

    function test_doNotServe_rateLimitedPerDay() public {
        vm.startPrank(president);
        for (uint256 i = 1; i <= 10; i++) {
            r.doNotServe(i, "x");
        }
        vm.expectRevert(BitchanRepublic.DnsRateLimited.selector);
        r.doNotServe(11, "x");
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days); // new day resets the budget
        vm.prank(president);
        r.doNotServe(11, "x");
        assertGt(r.dnsUntil(11), 0);
    }

    // ─── The Washington transition (immutable, one-way) ─────────────────────

    function test_transition_endsFoundingAtT() public {
        _claim(alice);
        _claim(bob);
        _claim(carol); // citizenCount == T
        r.pokeTransition();
        assertFalse(r.foundingPhase());
    }

    function test_transition_revertsWhenNotReady() public {
        _claim(alice); // below T, before long-stop
        vm.expectRevert(BitchanRepublic.TransitionNotReady.selector);
        r.pokeTransition();
    }

    function test_transition_longStopBackstop() public {
        vm.warp(block.timestamp + r.LONGSTOP());
        r.pokeTransition(); // works even with zero citizens
        assertFalse(r.foundingPhase());
    }

    function test_abdicate_isOneWayAndFounderOnly() public {
        vm.prank(alice);
        vm.expectRevert(Bitchan.NotPresident.selector);
        r.abdicate();

        vm.prank(president);
        r.abdicate();
        assertFalse(r.foundingPhase());

        // there is NO path back: poking after the end reverts, and no setter sets true
        vm.expectRevert(BitchanRepublic.FoundingEnded.selector);
        r.pokeTransition();
    }

    // ─── Founder lockouts (cannot fund self, cannot throttle growth) ─────────

    function test_founding_blocksTreasuryWithdrawal() public {
        _claim(alice); // treasury has funds
        vm.prank(gov);
        vm.expectRevert(BitchanRepublic.FoundingActive.selector);
        r.withdraw(gov, 1);
    }

    function test_founding_blocksRaisingCitizenshipCost() public {
        vm.prank(gov);
        vm.expectRevert(BitchanRepublic.FoundingActive.selector);
        r.setCitizenshipCost(COST * 2);
    }

    // ─── Treasury: rate-limited, governance-gated, base drain disabled ──────

    function test_withdraw_governanceOnlyAndRateLimited() public {
        _claim(alice);
        _claim(bob);
        _claim(carol);
        r.pokeTransition(); // founding over
        uint256 bal = r.treasury(); // 3 * COST

        // non-governance cannot withdraw
        vm.prank(president);
        vm.expectRevert();
        r.withdraw(president, 1);

        // governance may take up to 10% per 7-day window
        uint256 cap = bal / 10;
        vm.prank(gov);
        r.withdraw(gov, cap);
        assertEq(r.treasury(), bal - cap);

        // a second withdrawal in the same window that breaches the cap reverts
        vm.prank(gov);
        vm.expectRevert(BitchanRepublic.RateLimited.selector);
        r.withdraw(gov, 1);

        // next window: allowed again
        vm.warp(block.timestamp + 7 days);
        vm.prank(gov);
        r.withdraw(gov, 1);
    }

    function test_baseWithdrawAllIsDisabled() public {
        // Bitchan.withdrawTreasury (drain-all) must not bypass the rate-limit
        vm.prank(president);
        vm.expectRevert(BitchanRepublic.UseRateLimitedWithdraw.selector);
        r.withdrawTreasury(payable(president));
    }

    // ─── Governable params: governance-gated, floored, slash gated ──────────

    function test_setPostFee_isGovernanceNotPresident() public {
        // Art III §4: the President may NOT set the fee.
        vm.prank(president);
        vm.expectRevert();
        r.setPostFee(0.5 ether);

        vm.prank(gov);
        r.setPostFee(0.0015 ether); // a valid ≤2× raise
        assertEq(r.postFee(), 0.0015 ether);
    }

    function test_setPostFee_respectsFloor() public {
        uint256 floor = r.POST_FEE_FLOOR(); // read before the prank/expectRevert window
        vm.prank(gov);
        vm.expectRevert(BitchanRepublic.BelowFloor.selector);
        r.setPostFee(floor - 1);
    }

    function test_slash_isGovernanceOnly() public {
        _claim(alice);
        // a custodian cannot slash (Art VII §3: never a custodian's unilateral hand)
        vm.prank(president);
        r.grantCustodian(bob);
        vm.prank(bob);
        vm.expectRevert();
        r.slash(alice);

        vm.prank(gov);
        r.slash(alice);
        assertFalse(r.isCitizen(alice));
        assertEq(r.citizenCount(), 0);
    }

    // ─── Threat model: a maximally-malicious president can do none of these ──

    function test_maliciousPresident_cannotSetFee() public {
        vm.prank(president);
        vm.expectRevert();
        r.setPostFee(100 ether); // cannot price out speech
    }

    function test_maliciousPresident_cannotDrainTreasury() public {
        _claim(alice);
        vm.prank(president);
        vm.expectRevert(); // no governance role, and founding blocks it anyway
        r.withdraw(president, COST);
    }

    function test_maliciousPresident_cannotSlash() public {
        _claim(alice);
        vm.prank(president);
        vm.expectRevert();
        r.slash(alice);
    }

    // ─── Fuzz ───────────────────────────────────────────────────────────────

    function testFuzz_canVote_onlyAgedCitizens(uint64 age) public {
        age = uint64(bound(age, 0, 800 days));
        _claim(alice);
        uint64 threshold = r.ageThreshold();
        vm.warp(block.timestamp + age);
        assertEq(r.canVote(alice), age >= threshold);
    }

    function testFuzz_postFee_neverBelowFloor(uint256 newFee) public {
        uint256 floor = r.POST_FEE_FLOOR();
        uint256 cur = r.postFee();
        if (newFee < floor) {
            vm.prank(gov);
            vm.expectRevert(BitchanRepublic.BelowFloor.selector);
            r.setPostFee(newFee);
        } else {
            newFee = bound(newFee, floor, cur); // lowering/equal: no raise, no rate-limit
            vm.prank(gov);
            r.setPostFee(newFee);
            assertEq(r.postFee(), newFee);
        }
    }
}
