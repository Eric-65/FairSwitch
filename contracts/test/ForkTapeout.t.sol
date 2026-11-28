// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {FairSwitchRegistry} from "../src/FairSwitchRegistry.sol";
import {ITapeOutProcessor} from "../src/ITapeOutProcessor.sol";

interface IFactory {
    function isCPU(address cpu) external view returns (bool);
    function deployFee() external view returns (uint256);
    function createCPU(string calldata, string calldata, string calldata, uint256, uint256)
        external
        payable
        returns (address transistors, address circuits);
}

interface IProc is ITapeOutProcessor {
    function tapeout(bytes calldata nl, uint32 nIn, uint32 nOut) external payable returns (uint256);
    function TAPEOUT_FEE() external view returns (uint256);
    function transistors() external view returns (address);
    function nextId() external view returns (uint256);
}

interface ITransistors {
    function mint(uint256 id, uint256 amount) external payable;
    function mintPrice() external view returns (uint256);
    function protocolFee() external view returns (uint256);
}

/// @notice Rehearses the full mainnet flow on a LOCAL FORK (nothing is broadcast):
/// createCPU -> mint NAND -> tapeout our lockout netlist -> eval all 64 inputs on the real
/// TapeOut implementation -> registry with real USDT0 calling that circuit.
///   XLAYER_RPC=https://rpc.xlayer.tech forge test --match-contract ForkTapeout -vv
contract ForkTapeoutTest is Test {
    IFactory constant FACTORY = IFactory(0x1f09DAeFA827f02CBb40967cc91b259763760761);
    address constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    // Fee token the upgraded factory charges via transferFrom (found 2026-11-28, symbol "BEM", 8 decimals).
    address constant BEM = 0x60e62Efa9405d6873C5deaBD4E6CC91c25363952;

    bool live;
    bytes lockout;
    address me = makeAddr("rehearsal-operator");

    function setUp() public {
        string memory rpc = vm.envOr("XLAYER_RPC", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        live = true;
        lockout = vm.parseJsonBytes(vm.readFile("../circuit/build/lockout.json"), ".netlist");
        vm.deal(me, 1 ether);
    }

    uint256 constant MINT_PRICE = 1e6; // factory caps mintPrice at 1e12

    function _tryMint(ITransistors t, uint256 value) internal returns (bool) {
        try t.mint{value: value}(0, 19) {
            return true;
        } catch {
            return false;
        }
    }

    function _ref(uint8 n) internal pure returns (uint8) {
        bool op = n & 1 != 0;
        bool po = n & 2 != 0;
        bool ca = n & 4 != 0;
        bool ig = n & 8 != 0;
        bool sv = n & 16 != 0;
        bool t = n & 32 != 0;
        bool owned = op || (po && sv);
        bool relay = owned || (sv && !t && (ca || ig));
        bool warn = !owned && sv && !ca && ig;
        return (owned ? 1 : 0) | (relay ? 2 : 0) | (warn ? 4 : 0);
    }

    function test_forkRehearsal_fullFlow() public {
        if (!live) vm.skip(true);
        (address circuits, uint256 id) = _tapeout();
        _exhaustive(IProc(circuits), id);
        _registryFlow(circuits, id);
    }

    function _tapeout() internal returns (address circuits, uint256 id) {
        vm.startPrank(me);

        // 1. our processor
        uint256 deployFee = FACTORY.deployFee();
        address transistors;
        deal(BEM, me, 100e8);
        IERC20Metadata(BEM).approve(address(FACTORY), type(uint256).max);
        uint256 bemBefore = IERC20Metadata(BEM).balanceOf(me);
        (transistors, circuits) = FACTORY.createCPU("FairSwitch", "FSW", "rehearsal", 10000, MINT_PRICE);
        console2.log("BEM spent on createCPU", bemBefore - IERC20Metadata(BEM).balanceOf(me));
        console2.log("deployFee (BEM base units)", deployFee);
        console2.log("transistors", transistors);
        console2.log("circuits", circuits);
        assertTrue(FACTORY.isCPU(circuits), "circuits is the registered processor");
        IProc proc = IProc(circuits);
        assertEq(proc.transistors(), transistors);

        // 2. mint 19 NAND
        ITransistors t = ITransistors(transistors);
        IERC20Metadata(BEM).approve(transistors, type(uint256).max);
        console2.log("transistor mintPrice", t.mintPrice());
        console2.log("transistor protocolFee", t.protocolFee());
        uint256 bem0 = IERC20Metadata(BEM).balanceOf(me);
        uint256 okb0 = me.balance;
        bool paidInToken = _tryMint(t, 0);
        if (!paidInToken) t.mint{value: 19 * t.mintPrice() + t.protocolFee()}(0, 19);
        console2.log("mint paid in BEM?", paidInToken);
        console2.log("BEM spent on mint", bem0 - IERC20Metadata(BEM).balanceOf(me));
        console2.log("OKB spent on mint", okb0 - me.balance);

        // 3. tape out
        uint256 fee = proc.TAPEOUT_FEE();
        console2.log("TAPEOUT_FEE (wei)", fee);
        id = proc.tapeout{value: fee}(lockout, 6, 3);
        console2.log("circuit id", id);
        vm.stopPrank();
    }

    function _exhaustive(IProc proc, uint256 id) internal view {
        (uint32 nIn, uint32 nOut, uint32 nState, uint32 gates) = proc.circuitInfo(id);
        assertEq(nIn, 6);
        assertEq(nOut, 3);
        assertEq(nState, 0);
        assertEq(gates, 19);
        assertEq(keccak256(proc.netlist(id)), keccak256(lockout), "netlist stored verbatim");

        // 4. exhaustive on the real TapeOut evaluator
        for (uint8 n = 0; n < 64; n++) {
            bytes memory out = proc.eval(id, abi.encodePacked(n));
            assertEq(out.length, 1);
            assertEq(uint8(out[0]), _ref(n), "on-chain eval == formulas");
        }

    }

    function _registryFlow(address circuits, uint256 id) internal {
        // 5. registry with real USDT0 + this circuit
        FairSwitchRegistry reg = new FairSwitchRegistry(IERC20Metadata(USDT0));
        bytes32 dev = keccak256("fork-device");
        vm.prank(me);
        reg.registerDevice(dev, 10e6, 1e6, 2, circuits, id, keccak256(lockout));
        assertTrue(reg.ruleIntact(dev));

        address cust = makeAddr("cust");
        deal(USDT0, cust, 20e6);
        vm.startPrank(cust);
        IERC20Metadata(USDT0).approve(address(reg), type(uint256).max);
        reg.pay(dev, 3e6);
        vm.stopPrank();
        assertEq(IERC20Metadata(USDT0).balanceOf(me), 3e6);
        (bool owned, bool relay, bool warn) = reg.status(dev);
        assertTrue(relay && !owned && !warn);

        vm.warp(block.timestamp + 4 days);
        (, relay, warn) = reg.status(dev);
        assertTrue(relay && warn, "grace");
        vm.warp(block.timestamp + 1 days);
        (, relay,) = reg.status(dev);
        assertFalse(relay, "locked");

        vm.prank(cust);
        reg.pay(dev, 50e6);
        vm.warp(block.timestamp + 3650 days);
        (owned, relay,) = reg.status(dev);
        assertTrue(owned && relay, "owned forever");
        assertEq(IERC20Metadata(USDT0).balanceOf(cust), 10e6, "excess not taken");
    }
}
