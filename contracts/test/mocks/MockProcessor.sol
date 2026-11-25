// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITapeOutProcessor} from "../../src/ITapeOutProcessor.sol";

/// @notice Test double for a TapeOut processor: stores netlists and evaluates
/// NAND-only (flat, stateless) netlists with TAP-02 §4 semantics. Good enough to run
/// the real FairSwitch lockout bytes in unit tests; the fork test uses the real chain.
contract MockProcessor is ITapeOutProcessor {
    struct Circuit {
        uint32 nIn;
        uint32 nOut;
        bytes netlist;
    }

    mapping(uint256 => Circuit) internal circuits;
    uint256 public nextId = 1;

    function tapeout(bytes calldata nl, uint32 nIn, uint32 nOut) external returns (uint256 id) {
        id = nextId++;
        circuits[id] = Circuit(nIn, nOut, nl);
    }

    /// @dev Test hook: simulate an upgraded/tampered processor changing a stored netlist.
    function overwrite(uint256 id, bytes calldata nl) external {
        circuits[id].netlist = nl;
    }

    function circuitInfo(uint256 id) external view returns (uint32, uint32, uint32, uint32) {
        Circuit storage c = circuits[id];
        require(c.nOut != 0, "no circuit");
        return (c.nIn, c.nOut, 0, uint32(c.netlist.length / 7));
    }

    function netlist(uint256 id) external view returns (bytes memory) {
        return circuits[id].netlist;
    }

    function eval(uint256 id, bytes calldata inputs) external view returns (bytes memory out) {
        Circuit storage c = circuits[id];
        require(c.nOut != 0, "no circuit");
        bytes memory nl = c.netlist;
        uint256 nGates = nl.length / 7;
        uint256 nSig = 2 + c.nIn + nGates;
        bytes memory s = new bytes(nSig);
        s[1] = 0x01;
        for (uint256 i = 0; i < c.nIn; i++) {
            uint8 v = (i >> 3) < inputs.length ? (uint8(inputs[i >> 3]) >> (i & 7)) & 1 : 0;
            s[2 + i] = bytes1(v);
        }
        for (uint256 g = 0; g < nGates; g++) {
            uint256 p = g * 7;
            require(nl[p] == 0x00, "mock: NAND only");
            uint256 a = (uint256(uint8(nl[p + 1])) << 16) | (uint256(uint8(nl[p + 2])) << 8) | uint8(nl[p + 3]);
            uint256 b = (uint256(uint8(nl[p + 4])) << 16) | (uint256(uint8(nl[p + 5])) << 8) | uint8(nl[p + 6]);
            uint256 o = 2 + c.nIn + g;
            require(a < o && b < o, "NAND: future signal");
            s[o] = bytes1(1 - (uint8(s[a]) & uint8(s[b])));
        }
        out = new bytes((c.nOut + 7) / 8);
        for (uint256 k = 0; k < c.nOut; k++) {
            if (uint8(s[nSig - c.nOut + k]) == 1) out[k >> 3] = bytes1(uint8(out[k >> 3]) | uint8(1 << (k & 7)));
        }
    }
}
