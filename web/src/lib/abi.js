export const processorAbi = [
  { type: 'function', name: 'netlist', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ type: 'bytes' }] },
  { type: 'function', name: 'eval', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }, { name: 'inputs', type: 'bytes' }], outputs: [{ type: 'bytes' }] },
  { type: 'function', name: 'circuitInfo', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: 'nIn', type: 'uint32' }, { name: 'nOut', type: 'uint32' }, { name: 'nState', type: 'uint32' }, { name: 'gateCount', type: 'uint32' }] },
];

const device = {
  type: 'tuple',
  components: [
    { name: 'operator', type: 'address' }, { name: 'paidUntil', type: 'uint64' }, { name: 'graceDays', type: 'uint32' },
    { name: 'owned', type: 'bool' }, { name: 'processor', type: 'address' }, { name: 'circuitId', type: 'uint256' },
    { name: 'netlistHash', type: 'bytes32' }, { name: 'price', type: 'uint128' }, { name: 'dailyRate', type: 'uint128' },
    { name: 'totalPaid', type: 'uint128' },
  ],
};

export const registryAbi = [
  { type: 'function', name: 'registerDevice', stateMutability: 'nonpayable',
    inputs: [{ name: 'deviceId', type: 'bytes32' }, { name: 'priceUSDT', type: 'uint128' }, { name: 'dailyRateUSDT', type: 'uint128' },
      { name: 'graceDays', type: 'uint32' }, { name: 'processor', type: 'address' }, { name: 'circuitId', type: 'uint256' }, { name: 'netlistHash', type: 'bytes32' }],
    outputs: [] },
  { type: 'function', name: 'pay', stateMutability: 'nonpayable', inputs: [{ name: 'deviceId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'inputBits', stateMutability: 'view', inputs: [{ name: 'deviceId', type: 'bytes32' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'status', stateMutability: 'view', inputs: [{ name: 'deviceId', type: 'bytes32' }],
    outputs: [{ name: 'owned', type: 'bool' }, { name: 'relayOn', type: 'bool' }, { name: 'graceWarning', type: 'bool' }] },
  { type: 'function', name: 'ruleIntact', stateMutability: 'view', inputs: [{ name: 'deviceId', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getDevice', stateMutability: 'view', inputs: [{ name: 'deviceId', type: 'bytes32' }], outputs: [device] },
  { type: 'function', name: 'deviceCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'deviceIds', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'totalVolume', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'event', name: 'Paid', inputs: [
    { name: 'deviceId', type: 'bytes32', indexed: true }, { name: 'payer', type: 'address', indexed: true },
    { name: 'amount', type: 'uint256' }, { name: 'totalPaid', type: 'uint256' }, { name: 'paidUntil', type: 'uint64' }, { name: 'owned', type: 'bool' }] },
  { type: 'event', name: 'DeviceRegistered', inputs: [
    { name: 'deviceId', type: 'bytes32', indexed: true }, { name: 'operator', type: 'address', indexed: true },
    { name: 'price', type: 'uint256' }, { name: 'dailyRate', type: 'uint256' }, { name: 'graceDays', type: 'uint32' },
    { name: 'processor', type: 'address' }, { name: 'circuitId', type: 'uint256' }, { name: 'netlistHash', type: 'bytes32' }] },
];

export const erc20Abi = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
];
