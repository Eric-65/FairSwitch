export * from './netlist.js';
export { keccak256Bytes } from './keccak.js';
export { hexToBytes, bytesToHex } from './hex.js';

import { keccak256Bytes } from './keccak.js';
import { bytesToHex, hexToBytes } from './hex.js';

/** keccak256 of netlist bytes (Uint8Array or 0x-hex), as 0x-hex. This is the value a device pins. */
export function netlistHash(netlist) {
  const bytes = typeof netlist === 'string' ? hexToBytes(netlist) : netlist;
  return bytesToHex(keccak256Bytes(bytes));
}
