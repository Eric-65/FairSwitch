// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITapeOutProcessor} from "./ITapeOutProcessor.sol";

/// @title FairSwitchRegistry
/// @notice Pay-as-you-go devices whose lockout rule is a public TapeOut circuit.
/// Customers pay in USDT0; funds go straight to the operator (non-custodial).
/// The contract computes the circuit's 6 input bits from payment state and asks the
/// TapeOut processor to evaluate the circuit, mirroring what the device computes offline.
/// @dev A device's terms (price, daily rate, grace, circuit) cannot be changed after registration.
contract FairSwitchRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Input bit positions (bit i of the packed eval() input byte = input i, TAP-02 §5).
    uint8 internal constant OWNED_PREV = 1 << 0;
    uint8 internal constant PAID_OFF = 1 << 1;
    uint8 internal constant CREDIT_ACTIVE = 1 << 2;
    uint8 internal constant IN_GRACE = 1 << 3;
    uint8 internal constant STATE_VALID = 1 << 4;
    uint8 internal constant TAMPER = 1 << 5;

    struct Device {
        address operator;
        uint64 paidUntil;
        uint32 graceDays;
        bool owned;
        address processor;
        uint256 circuitId;
        bytes32 netlistHash;
        uint128 price; // USDT0 base units (6 decimals)
        uint128 dailyRate; // USDT0 base units per day
        uint128 totalPaid;
    }

    IERC20 public immutable usdt;

    mapping(bytes32 deviceId => Device) internal _devices;
    bytes32[] public deviceIds;
    uint256 public totalVolume;

    event DeviceRegistered(
        bytes32 indexed deviceId,
        address indexed operator,
        uint256 price,
        uint256 dailyRate,
        uint32 graceDays,
        address processor,
        uint256 circuitId,
        bytes32 netlistHash
    );
    event Paid(
        bytes32 indexed deviceId,
        address indexed payer,
        uint256 amount,
        uint256 totalPaid,
        uint64 paidUntil,
        bool owned
    );

    error AlreadyRegistered();
    error UnknownDevice();
    error InvalidTerms();
    error AlreadyOwned();
    error ZeroAmount();
    error BadCircuitOutput();

    constructor(IERC20 usdt_) {
        usdt = usdt_;
    }

    // ───────────────────────────── operator ─────────────────────────────

    function registerDevice(
        bytes32 deviceId,
        uint128 priceUSDT,
        uint128 dailyRateUSDT,
        uint32 graceDays,
        address processor,
        uint256 circuitId,
        bytes32 netlistHash
    ) external {
        if (_devices[deviceId].operator != address(0)) revert AlreadyRegistered();
        if (
            deviceId == bytes32(0) || priceUSDT == 0 || dailyRateUSDT == 0 || dailyRateUSDT > priceUSDT
                || graceDays > 365 || processor == address(0) || netlistHash == bytes32(0)
        ) revert InvalidTerms();

        _devices[deviceId] = Device({
            operator: msg.sender,
            paidUntil: 0,
            graceDays: graceDays,
            owned: false,
            processor: processor,
            circuitId: circuitId,
            netlistHash: netlistHash,
            price: priceUSDT,
            dailyRate: dailyRateUSDT,
            totalPaid: 0
        });
        deviceIds.push(deviceId);
        emit DeviceRegistered(deviceId, msg.sender, priceUSDT, dailyRateUSDT, graceDays, processor, circuitId, netlistHash);
    }

    // ───────────────────────────── customer ─────────────────────────────

    /// @notice Pay `amount` USDT0 toward a device. Only the part needed to reach the full
    /// price is transferred; anything above it is never taken (refunded by construction).
    /// Requires prior `approve(registry, amount)` on USDT0.
    /// @return accepted the amount actually transferred to the operator.
    function pay(bytes32 deviceId, uint256 amount) external nonReentrant returns (uint256 accepted) {
        Device storage d = _devices[deviceId];
        if (d.operator == address(0)) revert UnknownDevice();
        if (d.owned) revert AlreadyOwned();
        if (amount == 0) revert ZeroAmount();

        uint256 remaining = uint256(d.price) - d.totalPaid;
        accepted = amount > remaining ? remaining : amount;

        // effects
        uint256 start = block.timestamp > d.paidUntil ? block.timestamp : d.paidUntil;
        uint64 paidUntil = uint64(start + (accepted * 1 days) / d.dailyRate);
        uint128 totalPaid = d.totalPaid + uint128(accepted);
        bool owned = totalPaid >= d.price;
        d.totalPaid = totalPaid;
        d.paidUntil = paidUntil;
        d.owned = owned;
        totalVolume += accepted;
        emit Paid(deviceId, msg.sender, accepted, totalPaid, paidUntil, owned);

        // interaction: straight from payer to operator
        usdt.safeTransferFrom(msg.sender, d.operator, accepted);
    }

    // ───────────────────────────── views ─────────────────────────────

    /// @notice The 6 circuit input bits, packed LSB-first exactly as eval() takes them.
    /// On-chain, STATE_VALID = 1 (this contract is the payment state) and TAMPER = 0.
    function inputBits(bytes32 deviceId) public view returns (uint8 bits) {
        Device storage d = _devices[deviceId];
        if (d.operator == address(0)) revert UnknownDevice();
        if (d.owned) bits |= OWNED_PREV;
        if (d.totalPaid >= d.price) bits |= PAID_OFF;
        if (block.timestamp < d.paidUntil) bits |= CREDIT_ACTIVE;
        if (block.timestamp < uint256(d.paidUntil) + uint256(d.graceDays) * 1 days) bits |= IN_GRACE;
        bits |= STATE_VALID;
    }

    /// @notice Evaluate the device's public circuit on the TapeOut processor with the current
    /// input bits. This is the on-chain mirror of what the device computes offline.
    function status(bytes32 deviceId) external view returns (bool owned, bool relayOn, bool graceWarning) {
        Device storage d = _devices[deviceId];
        uint8 bits = inputBits(deviceId);
        bytes memory out = ITapeOutProcessor(d.processor).eval(d.circuitId, abi.encodePacked(bits));
        if (out.length == 0) revert BadCircuitOutput();
        uint8 o = uint8(out[0]);
        return (o & 1 != 0, o & 2 != 0, o & 4 != 0);
    }

    /// @notice True when the processor still returns the netlist the device was registered with.
    function ruleIntact(bytes32 deviceId) external view returns (bool) {
        Device storage d = _devices[deviceId];
        if (d.operator == address(0)) revert UnknownDevice();
        return keccak256(ITapeOutProcessor(d.processor).netlist(d.circuitId)) == d.netlistHash;
    }

    function getDevice(bytes32 deviceId) external view returns (Device memory) {
        Device memory d = _devices[deviceId];
        if (d.operator == address(0)) revert UnknownDevice();
        return d;
    }

    function deviceCount() external view returns (uint256) {
        return deviceIds.length;
    }
}
