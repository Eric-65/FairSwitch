// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT0", "USDT0") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

interface IPay {
    function pay(bytes32 deviceId, uint256 amount) external returns (uint256);
}

/// @notice Token that re-enters the registry during transferFrom.
contract ReentrantToken is ERC20 {
    IPay public target;
    bytes32 public id;

    constructor() ERC20("Evil", "EVL") {}

    function arm(IPay t, bytes32 d) external {
        target = t;
        id = d;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (address(target) != address(0)) target.pay(id, 1);
        return super.transferFrom(from, to, value);
    }
}
