import { keccak256, toBytes } from 'viem';

/** Device ids are bytes32. Human ids (e.g. "solar-kit-0001") are hashed with keccak256. */
export function toDeviceId(id) {
  if (/^0x[0-9a-fA-F]{64}$/.test(id)) return id;
  return keccak256(toBytes(String(id)));
}
