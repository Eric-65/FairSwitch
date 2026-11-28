// The lockout circuit as the device sees it: netlist bytes + pinned hash + evaluator.
import { load, beat, hexToBytes, netlistHash, decode } from '@fairswitch/evaluator';
import artifact from '../../../circuit/build/lockout.json';

export { artifact };
export const INPUTS = artifact.inputs;   // OWNED_PREV, PAID_OFF, CREDIT_ACTIVE, IN_GRACE, STATE_VALID, TAMPER
export const OUTPUTS = artifact.outputs; // OWNED, RELAY_ON, GRACE_WARNING
export const PINNED_HASH = artifact.netlistHash;

export function loadCircuit(netlistHex) {
  return load(hexToBytes(netlistHex), artifact.nIn, artifact.nOut);
}

/** Evaluate and also return every signal (for the wire diagram). */
export function evaluateWithSignals(circuit, bits) {
  const s = [0, 1, ...bits.map((b) => (b ? 1 : 0))];
  for (const e of circuit.elements) s.push(1 - (s[e.ins[0]] & s[e.ins[1]]));
  const { outputs } = beat(circuit, [], bits.map((b) => (b ? 1 : 0)));
  return { outputs, signals: s };
}

/**
 * A tampered copy: the RELAY_ON gate (gate 17 = NAND(18, 17)) gets its second wire moved
 * from signal 17 to 16. Result: the relay turns ON whenever tamper is set or state is invalid.
 * The hash no longer matches, so a pinned device refuses to run it.
 */
export function tamperedNetlist() {
  const bytes = hexToBytes(artifact.netlist);
  bytes[17 * 7 + 6] ^= 0x01; // low byte of wire b: 0x11 -> 0x10
  return bytes;
}

export const hashOf = (bytesOrHex) => netlistHash(bytesOrHex);
export const gates = () => decode(hexToBytes(artifact.netlist), artifact.nIn);

/** Input bits from payment state, exactly like FairSwitchRegistry.inputBits (+ device-side flags). */
export function inputBitsFrom({ ownedPrev, totalPaid, price, paidUntil, graceDays, now, stateValid = true, tamper = false }) {
  return [
    ownedPrev ? 1 : 0,
    totalPaid >= price ? 1 : 0,
    now < paidUntil ? 1 : 0,
    now < paidUntil + graceDays * 86400 ? 1 : 0,
    stateValid ? 1 : 0,
    tamper ? 1 : 0,
  ];
}
