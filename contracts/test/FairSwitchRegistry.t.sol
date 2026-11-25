// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FairSwitchRegistry} from "../src/FairSwitchRegistry.sol";
import {MockProcessor} from "./mocks/MockProcessor.sol";
import {MockUSDT, ReentrantToken, IPay} from "./mocks/MockUSDT.sol";

contract FairSwitchRegistryTest is Test {
    FairSwitchRegistry reg;
    MockUSDT usdt;
    MockProcessor proc;
    uint256 circuitId;
    bytes lockout;
    bytes32 lockoutHash;

    address operator = makeAddr("operator");
    address alice = makeAddr("alice");
    bytes32 constant DEV = keccak256("solar-kit-0001");

    uint128 constant PRICE = 100e6; // 100 USDT0
    uint128 constant RATE = 1e6; // 1 USDT0 / day
    uint32 constant GRACE = 3;

    function setUp() public {
        // The real lockout netlist produced by circuit/scripts/build.js
        string memory json = vm.readFile("../circuit/build/lockout.json");
        lockout = vm.parseJsonBytes(json, ".netlist");
        lockoutHash = vm.parseJsonBytes32(json, ".netlistHash");
        assertEq(keccak256(lockout), lockoutHash, "artifact hash");

        usdt = new MockUSDT();
        proc = new MockProcessor();
        circuitId = proc.tapeout(lockout, 6, 3);
        reg = new FairSwitchRegistry(IERC20(address(usdt)));

        vm.prank(operator);
        reg.registerDevice(DEV, PRICE, RATE, GRACE, address(proc), circuitId, lockoutHash);

        usdt.mint(alice, 1_000e6);
        vm.prank(alice);
        usdt.approve(address(reg), type(uint256).max);
        vm.warp(1_800_000_000);
    }

    function _pay(uint256 amount) internal returns (uint256) {
        vm.prank(alice);
        return reg.pay(DEV, amount);
    }

    function _status() internal view returns (bool owned, bool relay, bool warn) {
        return reg.status(DEV);
    }

    // ───────────── registration ─────────────

    function test_register_storesTerms() public view {
        FairSwitchRegistry.Device memory d = reg.getDevice(DEV);
        assertEq(d.operator, operator);
        assertEq(d.price, PRICE);
        assertEq(d.dailyRate, RATE);
        assertEq(d.graceDays, GRACE);
        assertEq(d.netlistHash, lockoutHash);
        assertEq(reg.deviceCount(), 1);
        assertTrue(reg.ruleIntact(DEV));
    }

    function test_register_rejectsDuplicateAndBadTerms() public {
        vm.expectRevert(FairSwitchRegistry.AlreadyRegistered.selector);
        reg.registerDevice(DEV, PRICE, RATE, GRACE, address(proc), circuitId, lockoutHash);

        bytes32 d2 = keccak256("d2");
        vm.expectRevert(FairSwitchRegistry.InvalidTerms.selector);
        reg.registerDevice(d2, 0, RATE, GRACE, address(proc), circuitId, lockoutHash);
        vm.expectRevert(FairSwitchRegistry.InvalidTerms.selector);
        reg.registerDevice(d2, PRICE, 0, GRACE, address(proc), circuitId, lockoutHash);
        vm.expectRevert(FairSwitchRegistry.InvalidTerms.selector);
        reg.registerDevice(d2, PRICE, PRICE + 1, GRACE, address(proc), circuitId, lockoutHash);
        vm.expectRevert(FairSwitchRegistry.InvalidTerms.selector);
        reg.registerDevice(d2, PRICE, RATE, GRACE, address(0), circuitId, lockoutHash);
        vm.expectRevert(FairSwitchRegistry.InvalidTerms.selector);
        reg.registerDevice(d2, PRICE, RATE, GRACE, address(proc), circuitId, bytes32(0));
    }

    // ───────────── state transitions ─────────────

    function test_newDevice_isLocked() public view {
        (bool owned, bool relay, bool warn) = _status();
        assertFalse(owned);
        assertFalse(relay);
        assertFalse(warn);
        assertEq(reg.inputBits(DEV), 0x10); // only STATE_VALID
    }

    function test_active_afterPayment() public {
        _pay(5e6); // 5 days
        FairSwitchRegistry.Device memory d = reg.getDevice(DEV);
        assertEq(d.paidUntil, block.timestamp + 5 days);
        assertEq(usdt.balanceOf(operator), 5e6, "non-custodial: straight to operator");
        assertEq(usdt.balanceOf(address(reg)), 0);
        (bool owned, bool relay, bool warn) = _status();
        assertFalse(owned);
        assertTrue(relay);
        assertFalse(warn);
        assertEq(reg.inputBits(DEV), 0x1c); // CREDIT_ACTIVE | IN_GRACE | STATE_VALID
    }

    function test_grace_thenLocked() public {
        _pay(2e6);
        vm.warp(block.timestamp + 2 days); // credit just expired
        (, bool relay, bool warn) = _status();
        assertTrue(relay, "grace keeps relay on");
        assertTrue(warn, "grace warning");

        vm.warp(block.timestamp + GRACE * 1 days - 1);
        (, relay, warn) = _status();
        assertTrue(relay);
        assertTrue(warn);

        vm.warp(block.timestamp + 1); // grace over
        (, relay, warn) = _status();
        assertFalse(relay, "locked");
        assertFalse(warn);
    }

    function test_partialPayments_stackOnCredit() public {
        _pay(3e6);
        vm.warp(block.timestamp + 1 days);
        _pay(2e6); // extends from paidUntil, not now
        FairSwitchRegistry.Device memory d = reg.getDevice(DEV);
        assertEq(d.totalPaid, 5e6);
        assertEq(d.paidUntil, block.timestamp - 1 days + 5 days);
    }

    function test_paymentAfterLock_restartsFromNow() public {
        _pay(1e6);
        vm.warp(block.timestamp + 30 days);
        (, bool relay,) = _status();
        assertFalse(relay);
        _pay(1e6);
        assertEq(reg.getDevice(DEV).paidUntil, block.timestamp + 1 days);
        (, relay,) = _status();
        assertTrue(relay);
    }

    function test_fractionalDay() public {
        _pay(500_000); // half a day
        assertEq(reg.getDevice(DEV).paidUntil, block.timestamp + 12 hours);
    }

    function test_overpay_onlyRemainingIsTaken() public {
        _pay(90e6);
        uint256 before = usdt.balanceOf(alice);
        uint256 accepted = _pay(50e6);
        assertEq(accepted, 10e6);
        assertEq(before - usdt.balanceOf(alice), 10e6, "excess never leaves the payer");
        assertEq(usdt.balanceOf(operator), PRICE);
        assertTrue(reg.getDevice(DEV).owned);
    }

    function test_payoff_emitsOwned() public {
        vm.expectEmit(true, true, false, true);
        emit FairSwitchRegistry.Paid(DEV, alice, PRICE, PRICE, uint64(block.timestamp + 100 days), true);
        _pay(PRICE);
    }

    function test_ownedForever() public {
        _pay(PRICE);
        for (uint256 i = 0; i < 5; i++) {
            vm.warp(block.timestamp + 3650 days);
            (bool owned, bool relay, bool warn) = _status();
            assertTrue(owned);
            assertTrue(relay);
            assertFalse(warn);
        }
        vm.expectRevert(FairSwitchRegistry.AlreadyOwned.selector);
        _pay(1);
    }

    function test_pay_rejectsUnknownAndZero() public {
        vm.prank(alice);
        vm.expectRevert(FairSwitchRegistry.UnknownDevice.selector);
        reg.pay(keccak256("nope"), 1e6);
        vm.expectRevert(FairSwitchRegistry.ZeroAmount.selector);
        _pay(0);
    }

    function test_pay_withoutAllowance_reverts() public {
        address bob = makeAddr("bob");
        usdt.mint(bob, 10e6);
        vm.prank(bob);
        vm.expectRevert();
        reg.pay(DEV, 1e6);
        assertEq(reg.getDevice(DEV).totalPaid, 0, "state rolled back");
    }

    function test_reentrancy_blocked() public {
        ReentrantToken evil = new ReentrantToken();
        FairSwitchRegistry r2 = new FairSwitchRegistry(IERC20(address(evil)));
        vm.prank(operator);
        r2.registerDevice(DEV, PRICE, RATE, GRACE, address(proc), circuitId, lockoutHash);
        evil.mint(alice, 100e6);
        vm.prank(alice);
        evil.approve(address(r2), type(uint256).max);
        evil.arm(IPay(address(r2)), DEV);
        vm.prank(alice);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        r2.pay(DEV, 1e6);
    }

    function test_tamperedProcessor_detected() public {
        bytes memory evil = lockout;
        evil[evil.length - 1] = 0x10; // rewire the last gate
        proc.overwrite(circuitId, evil);
        assertFalse(reg.ruleIntact(DEV));
    }

    function test_totalVolume_and_count() public {
        _pay(7e6);
        _pay(3e6);
        assertEq(reg.totalVolume(), 10e6);
    }

    // ───────────── circuit mirror ─────────────

    /// status() (processor eval of the real netlist) == the spec formulas, for random histories.
    function testFuzz_statusMatchesFormulas(uint64[6] memory payments, uint32[6] memory gaps) public {
        for (uint256 i = 0; i < 6; i++) {
            vm.warp(block.timestamp + (gaps[i] % 40 days));
            FairSwitchRegistry.Device memory d = reg.getDevice(DEV);
            if (!d.owned && payments[i] % 4 != 0) _pay(1 + (payments[i] % 60e6));
            d = reg.getDevice(DEV);
            uint8 bits = reg.inputBits(DEV);
            bool ownedPrev = bits & 1 != 0;
            bool paidOff = bits & 2 != 0;
            bool credit = bits & 4 != 0;
            bool grace = bits & 8 != 0;
            bool owned = ownedPrev || paidOff;
            bool relay = owned || credit || grace;
            bool warn = !owned && !credit && grace;
            (bool o, bool r, bool w) = _status();
            assertEq(o, owned);
            assertEq(r, relay);
            assertEq(w, warn);
            assertEq(credit, block.timestamp < d.paidUntil);
            assertLe(d.totalPaid, d.price);
        }
    }

    /// Never-relock: once owned, the relay is on at any later time.
    function testFuzz_neverRelock(uint64 amount, uint32 laterA, uint32 laterB) public {
        _pay(1 + (amount % PRICE));
        _pay(PRICE); // finishes it (excess not taken)
        vm.warp(block.timestamp + laterA);
        (bool o, bool r,) = _status();
        assertTrue(o && r);
        vm.warp(block.timestamp + uint256(laterB) * 1000);
        (o, r,) = _status();
        assertTrue(o && r);
    }
}
