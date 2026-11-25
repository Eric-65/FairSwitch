// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FairSwitchRegistry} from "../src/FairSwitchRegistry.sol";

/// Dry run (no broadcast, no key):
///   forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC
/// Real deploy — run it YOURSELF after review, with your own wallet (e.g. --ledger or --interactives 1):
///   forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC --broadcast --interactives 1
contract Deploy is Script {
    address constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736; // TODO: verify on OKLink

    function run() external returns (FairSwitchRegistry reg) {
        require(block.chainid == 196, "not X Layer");
        vm.startBroadcast();
        reg = new FairSwitchRegistry(IERC20(USDT0));
        vm.stopBroadcast();
        console2.log("FairSwitchRegistry:", address(reg));
    }
}
