// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IProc, ITransistors} from "./ForkTapeout.t.sol";

/// Path B rehearsal (fork only): tape out on an existing processor (OrderGuard).
contract ForkPathBTest is Test {
    address constant BEM = 0x60e62Efa9405d6873C5deaBD4E6CC91c25363952;
    IProc constant ORDERGUARD = IProc(0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355);

    function test_forkRehearsal_existingProcessor() public {
        string memory rpc = vm.envOr("XLAYER_RPC", string(""));
        if (bytes(rpc).length == 0) vm.skip(true);
        vm.createSelectFork(rpc);
        bytes memory nl = vm.parseJsonBytes(vm.readFile("../circuit/build/lockout.json"), ".netlist");
        address me = makeAddr("b");
        vm.deal(me, 1 ether);
        deal(BEM, me, 100e8);
        ITransistors t = ITransistors(ORDERGUARD.transistors());
        console2.log("mintPrice", t.mintPrice());
        console2.log("protocolFee", t.protocolFee());
        vm.startPrank(me);
        IERC20Metadata(BEM).approve(address(t), type(uint256).max);
        uint256 b0 = IERC20Metadata(BEM).balanceOf(me);
        uint256 o0 = me.balance;
        try t.mint(0, 19) {
            console2.log("mint without OKB ok (BEM)");
        } catch {
            t.mint{value: 19 * t.mintPrice() + t.protocolFee()}(0, 19);
            console2.log("mint paid in OKB");
        }
        console2.log("BEM spent", b0 - IERC20Metadata(BEM).balanceOf(me));
        console2.log("OKB spent", o0 - me.balance);
        uint256 id = ORDERGUARD.tapeout{value: ORDERGUARD.TAPEOUT_FEE()}(nl, 6, 3);
        vm.stopPrank();
        console2.log("circuit id", id);
        for (uint8 n = 0; n < 64; n++) ORDERGUARD.eval(id, abi.encodePacked(n));
    }
}
