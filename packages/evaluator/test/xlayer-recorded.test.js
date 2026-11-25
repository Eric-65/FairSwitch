// Decoder vs. circuits read from X Layer mainnet (chain 196).
// The fixture is a THIRD-PARTY recording (Tajudeeen/netlist) of netlist() + circuitInfo().
// It contains no eval() results, so here we check structure only:
// decode -> re-encode is byte-exact and gateCount/nState match circuitInfo.
// The live check that also compares eval() is circuit/scripts/verify-live.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decode, encode, load, hexToBytes, bytesToHex, OP_REF } from '../src/index.js';

const F = JSON.parse(readFileSync(new URL('./fixtures/xlayer-recorded.json', import.meta.url)));

for (const c of F.circuits) {
  test(`X Layer ${c.processor} #${c.tokenId} (block ${F.block})`, () => {
    const bytes = hexToBytes(c.netlist);
    const els = decode(bytes, c.nIn);
    assert.equal(bytesToHex(encode(els)), c.netlist.toLowerCase());
    const hasRef = els.some((e) => e.op === OP_REF);
    if (!hasRef) {
      const circ = load(bytes, c.nIn, c.nOut);
      assert.equal(circ.nGates, c.gateCount);
      assert.equal(circ.nState, c.nState);
    }
  });
}
