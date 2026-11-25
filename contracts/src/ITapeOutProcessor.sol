// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Read-only part of a TapeOut processor contract, as specified in TAP-02 §6
/// (selectors: netlist 0x3fc4be56, eval 0x934d06ea, circuitInfo 0x084d60f1).
interface ITapeOutProcessor {
    function circuitInfo(uint256 id) external view returns (uint32 nIn, uint32 nOut, uint32 nState, uint32 gateCount);
    function netlist(uint256 id) external view returns (bytes memory);
    /// @dev Inputs and outputs are packed LSB-first (TAP-02 §5). Reverts for circuits with state.
    function eval(uint256 id, bytes calldata inputs) external view returns (bytes memory);
}
