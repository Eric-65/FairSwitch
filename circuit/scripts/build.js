// Generates circuit/build/lockout.json: netlist hex, hash, truth table.
import { writeFileSync, mkdirSync } from 'node:fs';
import { load, evalPacked, bytesToHex, netlistHash, pack } from '@fairswitch/evaluator';
import { buildNetlist, N_IN, N_OUT, INPUTS, OUTPUTS, GATES, bitsOf, reference } from '../src/lockout.js';

const bytes = buildNetlist();
const c = load(bytes, N_IN, N_OUT);
const truthTable = [];
for (let n = 0; n < 1 << N_IN; n++) {
  const out = evalPacked(c, pack(bitsOf(n)));
  const ref = pack(reference(bitsOf(n)));
  if (out[0] !== ref[0]) throw new Error(`mismatch at input ${n}`);
  truthTable.push({ in: n, out: out[0] });
}
const artifact = {
  name: 'FairSwitch lockout v1',
  format: 'TAP-02 flat NAND netlist',
  nIn: N_IN,
  nOut: N_OUT,
  nState: c.nState,
  gateCount: c.nGates,
  bytes: bytes.length,
  inputs: INPUTS,
  outputs: OUTPUTS,
  gates: GATES.map(([name, a, b], k) => ({ signal: 2 + N_IN + k, name, a, b })),
  netlist: bytesToHex(bytes),
  netlistHash: netlistHash(bytes),
  truthTable,
};
mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../build/lockout.json', import.meta.url), JSON.stringify(artifact, null, 2) + '\n');
console.log(`lockout: ${artifact.gateCount} NAND, ${artifact.bytes} bytes`);
console.log(`netlist     ${artifact.netlist}`);
console.log(`netlistHash ${artifact.netlistHash}`);
