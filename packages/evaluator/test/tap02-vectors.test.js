// TAP-02 official test vectors (TapeOutProtocol/TAPs assets/tap-02/vectors.json, CC0).
// SHA-256 of the fixture must equal the value printed in TAP-02 ("Test Cases").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { load, beat, encode, decode, evalPacked, stepPacked, hexToBytes, bytesToHex, IllFormed } from '../src/index.js';

const raw = readFileSync(new URL('./fixtures/tap02-vectors.json', import.meta.url));
const V = JSON.parse(raw);
const hx = (s) => hexToBytes('0x' + s);

test('fixture is the exact file TAP-02 pins (sha256)', () => {
  assert.equal(createHash('sha256').update(raw).digest('hex'), '1a02f5cf991c130a22dc6cc6ee93d0f8fe0720afed081665fa8b8018aefd203b');
});

function resolverFor(refs) {
  const loaded = new Map();
  for (const r of refs) loaded.set(`${r.cpu.toLowerCase()}#${r.id}`, load(hexToBytes(r.netlist), r.nIn, r.nOut));
  return (cpu, id) => loaded.get(`${bytesToHex(cpu)}#${id}`) ?? null;
}

for (const v of V.valid) {
  test(`valid: ${v.name}`, () => {
    const bytes = hexToBytes(v.netlist);
    const c = load(bytes, v.nIn, v.nOut, resolverFor(v.refs));
    assert.equal(c.nState, v.nState);
    // decode -> encode round trip is byte-exact
    assert.equal(bytesToHex(encode(decode(bytes, v.nIn))), v.netlist.toLowerCase());
    if (v.truthTable) {
      for (const row of v.truthTable) assert.equal(bytesToHex(evalPacked(c, hx(row.inputs))), '0x' + row.outputs, `in=${row.inputs}`);
    }
    if (v.beats) {
      for (const b of v.beats) {
        const r = stepPacked(c, hx(b.state), hx(b.inputs));
        assert.equal(bytesToHex(r.newState), '0x' + b.newState);
        assert.equal(bytesToHex(r.outputs), '0x' + b.outputs);
      }
    }
  });
}

for (const v of V.illFormed) {
  test(`ill-formed rejected: ${v.name}`, () => {
    assert.throws(() => load(hexToBytes(v.netlist), v.nIn, v.nOut, resolverFor(v.refs)), IllFormed);
  });
}

test('packing edge cases behave like the contracts', () => {
  const nand = V.valid.find((x) => x.name === V.packingEdgeCases.circuit);
  const c = load(hexToBytes(nand.netlist), nand.nIn, nand.nOut);
  for (const k of V.packingEdgeCases.cases) assert.equal(bytesToHex(evalPacked(c, hx(k.inputs))), '0x' + k.outputs, k.case);
});

test('eval refuses circuits with state, like the chain', () => {
  const t = V.valid.find((x) => x.name === 'toggle');
  assert.throws(() => evalPacked(load(hexToBytes(t.netlist), t.nIn, t.nOut), new Uint8Array([1])), /has latch/);
});

test('beat input validation', () => {
  const c = load(hexToBytes('0x00000002000003'), 2, 1);
  assert.throws(() => beat(c, [], [1]));
});
