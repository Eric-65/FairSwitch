// Shared X Layer config + ABIs. Addresses marked TODO: verify are from
// third-party repos / TAP-10 and must be re-checked on OKLink before mainnet use.
import { createPublicClient, http, fallback, defineChain } from 'viem';

export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech', 'https://xlayerrpc.okx.com'] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' } },
});

export function client() {
  const urls = process.env.XLAYER_RPC ? [process.env.XLAYER_RPC] : xLayer.rpcUrls.default.http;
  return createPublicClient({ chain: xLayer, transport: fallback(urls.map((u) => http(u, { timeout: 15_000 }))) });
}

// TAP-10 Deployments table (Base + X Layer share the address). TAP-02 §6 selectors.
export const FACTORY = '0x1f09DAeFA827f02CBb40967cc91b259763760761';
// Since the factory upgrade (implementation 0x336e9F0F4c3fEe7C8c803377e4DEA00293f4ae2a, seen 2026-11-28),
// createCPU is NOT payable: deployFee is pulled with transferFrom in this 8-decimal token ("BEM"),
// and new processors' transistors are paid in it too. Verified on a mainnet fork (ForkTapeout.t.sol).
export const BEM = '0x60e62Efa9405d6873C5deaBD4E6CC91c25363952';
export const erc20Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

export const processorAbi = [
  { type: 'function', name: 'nextId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'circuitInfo', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: 'nIn', type: 'uint32' }, { name: 'nOut', type: 'uint32' }, { name: 'nState', type: 'uint32' }, { name: 'gateCount', type: 'uint32' }] },
  { type: 'function', name: 'netlist', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ type: 'bytes' }] },
  { type: 'function', name: 'eval', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }, { name: 'inputs', type: 'bytes' }], outputs: [{ type: 'bytes' }] },
  { type: 'function', name: 'step', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }, { name: 'state', type: 'bytes' }, { name: 'inputs', type: 'bytes' }],
    outputs: [{ name: 'newState', type: 'bytes' }, { name: 'outputs', type: 'bytes' }] },
  { type: 'function', name: 'tapeout', stateMutability: 'payable', inputs: [{ name: 'netlist', type: 'bytes' }, { name: 'nIn', type: 'uint32' }, { name: 'nOut', type: 'uint32' }], outputs: [{ name: 'id', type: 'uint256' }] },
  // Not in TAP-02 §6; seen in xm1319/tapemkt; verified on a mainnet fork 2026-11-28.
  { type: 'function', name: 'TAPEOUT_FEE', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transistors', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];

export const factoryAbi = [
  { type: 'function', name: 'isCPU', stateMutability: 'view', inputs: [{ name: 'cpu', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'cpuCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'cpuAt', stateMutability: 'view', inputs: [{ name: 'i', type: 'uint256' }], outputs: [{ type: 'address' }] },
  // createCPU signature from xm1319/tapemkt; verified on a mainnet fork 2026-11-28 (now non-payable, fee in BEM).
  { type: 'function', name: 'createCPU', stateMutability: 'nonpayable',
    inputs: [{ name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'story', type: 'string' }, { name: 'transistorSupply', type: 'uint256' }, { name: 'mintPrice', type: 'uint256' }],
    outputs: [{ name: 'transistors', type: 'address' }, { name: 'circuits', type: 'address' }] },
  { type: 'function', name: 'deployFee', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'protocolFee', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

// From xm1319/tapemkt; verified on a mainnet fork 2026-11-28: mint(0, n) mints n NAND.
// Old processors (e.g. OrderGuard) charge OKB (payable); processors from the upgraded factory charge BEM.
export const transistorAbi = [
  { type: 'function', name: 'mint', stateMutability: 'payable', inputs: [{ name: 'id', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'mintPrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'protocolFee', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'supplyCap', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minted', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];
