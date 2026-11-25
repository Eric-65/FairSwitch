// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {FairSwitchRegistry} from "../src/FairSwitchRegistry.sol";
import {ITapeOutProcessor} from "../src/ITapeOutProcessor.sol";

/// @notice Fork tests against X Layer mainnet (chain 196). Skipped unless XLAYER_RPC is set.
///   XLAYER_RPC=https://rpc.xlayer.tech forge test --match-contract Fork -vv
/// Optional, after our tape-out: FS_PROCESSOR=0x.. FS_CIRCUIT_ID=n
contract ForkTest is Test {
    address constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    // OrderGuard MAJ3, reported by xm1319/tapemkt. Used to check the TAP-02 eval ABI on chain.
    address constant ORDERGUARD = 0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355;

    bool live;

    function setUp() public {
        string memory rpc = vm.envOr("XLAYER_RPC", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        live = true;
    }

    function test_fork_chainAndUsdt0() public {
        if (!live) vm.skip(true);
        assertEq(block.chainid, 196);
        assertGt(USDT0.code.length, 0, "USDT0 has code");
        assertEq(IERC20Metadata(USDT0).decimals(), 6);
        emit log_named_string("USDT0 symbol", IERC20Metadata(USDT0).symbol());
    }

    function test_fork_tapeoutEvalAbi() public {
        if (!live) vm.skip(true);
        ITapeOutProcessor p = ITapeOutProcessor(ORDERGUARD);
        (uint32 nIn, uint32 nOut, uint32 nState,) = p.circuitInfo(3);
        assertEq(nIn, 3);
        assertEq(nOut, 1);
        assertEq(nState, 0);
        // MAJ3 truth table: 000->0 001->0 010->0 011->1 100->0 101->1 110->1 111->1
        uint8[8] memory expect = [0, 0, 0, 1, 0, 1, 1, 1];
        for (uint8 i = 0; i < 8; i++) {
            bytes memory out = p.eval(3, abi.encodePacked(i));
            assertEq(uint8(out[0]), expect[i]);
        }
    }

    function test_fork_registryWithRealUsdtAndCircuit() public {
        if (!live) vm.skip(true);
        address processor = vm.envOr("FS_PROCESSOR", address(0));
        uint256 cid = vm.envOr("FS_CIRCUIT_ID", uint256(0));
        if (processor == address(0)) vm.skip(true);

        bytes32 h = keccak256(ITapeOutProcessor(processor).netlist(cid));
        FairSwitchRegistry reg = new FairSwitchRegistry(IERC20Metadata(USDT0));
        address op = makeAddr("op");
        address cust = makeAddr("cust");
        bytes32 dev = keccak256("fork-device");
        vm.prank(op);
        reg.registerDevice(dev, 10e6, 1e6, 2, processor, cid, h);
        assertTrue(reg.ruleIntact(dev));

        deal(USDT0, cust, 20e6);
        vm.startPrank(cust);
        IERC20Metadata(USDT0).approve(address(reg), type(uint256).max);
        reg.pay(dev, 3e6);
        vm.stopPrank();
        assertEq(IERC20Metadata(USDT0).balanceOf(op), 3e6);
        (, bool relay,) = reg.status(dev);
        assertTrue(relay);

        vm.warp(block.timestamp + 6 days);
        (, relay,) = reg.status(dev);
        assertFalse(relay);

        vm.prank(cust);
        reg.pay(dev, 50e6);
        (bool owned, bool relay2,) = reg.status(dev);
        assertTrue(owned && relay2);
        assertEq(IERC20Metadata(USDT0).balanceOf(cust), 10e6);
    }
}
