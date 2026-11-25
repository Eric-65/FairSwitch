// FairSwitch lockout circuit — flat NAND netlist (TAP-02), no LATCH, no REF.
//
// Stateless "feedback-bit" design: the device stores OWNED in non-volatile memory
// (set-only) and feeds it back as input i0 on every evaluation. Being purely
// combinational, the circuit can be evaluated with the processor's free eval()
// (eval reverts for circuits with LATCH state) and tested exhaustively (2^6 = 64).
//
// Inputs (bit i of the packed input byte = input i, LSB first, TAP-02 §5):
//   i0 OWNED_PREV    signal 2
//   i1 PAID_OFF      signal 3
//   i2 CREDIT_ACTIVE signal 4
//   i3 IN_GRACE      signal 5
//   i4 STATE_VALID   signal 6
//   i5 TAMPER        signal 7
// Outputs (the last 3 signals, in order):
//   o0 OWNED         = OWNED_PREV OR (PAID_OFF AND STATE_VALID)
//   o1 RELAY_ON      = OWNED OR (STATE_VALID AND NOT TAMPER AND (CREDIT_ACTIVE OR IN_GRACE))
//   o2 GRACE_WARNING = NOT OWNED AND STATE_VALID AND NOT CREDIT_ACTIVE AND IN_GRACE

export const INPUTS = ['OWNED_PREV', 'PAID_OFF', 'CREDIT_ACTIVE', 'IN_GRACE', 'STATE_VALID', 'TAMPER'];
export const OUTPUTS = ['OWNED', 'RELAY_ON', 'GRACE_WARNING'];

const OP = 2, PO = 3, CA = 4, IG = 5, SV = 6, T = 7;

// [name, a, b] — gate k produces signal 8 + k. Order is topological by construction.
export const GATES = [
  ['nPOSV',     PO, SV],   //  8  ¬(PAID_OFF ∧ STATE_VALID)
  ['nOP',       OP, OP],   //  9  ¬OWNED_PREV
  ['owned',      9,  8],   // 10  OWNED_PREV ∨ (PAID_OFF ∧ STATE_VALID)
  ['nCA',       CA, CA],   // 11  ¬CREDIT_ACTIVE
  ['nIG',       IG, IG],   // 12  ¬IN_GRACE
  ['caOrIg',    11, 12],   // 13  CREDIT_ACTIVE ∨ IN_GRACE
  ['nT',         T,  T],   // 14  ¬TAMPER
  ['nSVnT',     SV, 14],   // 15  ¬(STATE_VALID ∧ ¬TAMPER)
  ['svnT',      15, 15],   // 16  STATE_VALID ∧ ¬TAMPER
  ['nPayRun',   16, 13],   // 17  ¬(STATE_VALID ∧ ¬TAMPER ∧ (CA ∨ IG))
  ['nOwned',    10, 10],   // 18  ¬OWNED
  ['nNoSV',     18, SV],   // 19  ¬(¬OWNED ∧ STATE_VALID)
  ['noSV',      19, 19],   // 20  ¬OWNED ∧ STATE_VALID
  ['nGraceWin', 11, IG],   // 21  ¬(¬CREDIT_ACTIVE ∧ IN_GRACE)
  ['graceWin',  21, 21],   // 22  ¬CREDIT_ACTIVE ∧ IN_GRACE
  ['nGW',       20, 22],   // 23  ¬GRACE_WARNING
  ['OWNED',     18, 18],   // 24  o0
  ['RELAY_ON',  18, 17],   // 25  o1 = OWNED ∨ payRun
  ['GRACE_WARNING', 23, 23], // 26 o2
];

export const N_IN = INPUTS.length;
export const N_OUT = OUTPUTS.length;

/** Netlist bytes: one 7-byte NAND record per gate. */
export function buildNetlist() {
  const out = new Uint8Array(GATES.length * 7);
  GATES.forEach(([, a, b], k) => {
    const p = k * 7;
    out[p] = 0x00;
    out[p + 1] = (a >>> 16) & 0xff; out[p + 2] = (a >>> 8) & 0xff; out[p + 3] = a & 0xff;
    out[p + 4] = (b >>> 16) & 0xff; out[p + 5] = (b >>> 8) & 0xff; out[p + 6] = b & 0xff;
  });
  return out;
}

/** Reference boolean formulas (the spec), independent of the gates. */
export function reference(bits) {
  const [ownedPrev, paidOff, credit, grace, valid, tamper] = bits.map(Boolean);
  const owned = ownedPrev || (paidOff && valid);
  const relay = owned || (valid && !tamper && (credit || grace));
  const warn = !owned && valid && !credit && grace;
  return [owned, relay, warn].map(Number);
}

/** Input index -> bit array (bit i of n = input i). */
export function bitsOf(n) {
  return INPUTS.map((_, i) => (n >> i) & 1);
}
