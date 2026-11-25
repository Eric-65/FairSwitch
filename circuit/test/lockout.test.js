import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, beat, evalPacked, pack, unpack, decode, encode, bytesToHex, netlistHash } from '@fairswitch/evaluator';
import { buildNetlist, N_IN, N_OUT, bitsOf, reference } from '../src/lockout.js';

const bytes = buildNetlist();
const c = load(bytes, N_IN, N_OUT);
const run = (bits) => beat(c, [], bits).outputs;
const ALL = Array.from({ length: 64 }, (_, n) => bitsOf(n));

test('netlist is well-formed, flat, stateless, 19 NAND', () => {
  assert.equal(c.nState, 0);
  assert.equal(c.nGates, 19);
  assert.ok(decode(bytes, N_IN).every((e) => e.op === 0x00));
  assert.equal(bytesToHex(encode(decode(bytes, N_IN))), bytesToHex(bytes));
});

test('exhaustive: evaluator == reference formulas for all 64 inputs', () => {
  let n = 0;
  for (const bits of ALL) {
    assert.deepEqual(run(bits), reference(bits), `inputs ${bits.join('')}`);
    // packed path (what eval() on chain receives/returns)
    assert.deepEqual(unpack(evalPacked(c, pack(bits)), 3), reference(bits));
    n++;
  }
  assert.equal(n, 64);
});

test('never-relock: OWNED_PREV=1 => OWNED=1 and RELAY_ON=1 for all 32 other combinations', () => {
  const cases = ALL.filter((b) => b[0] === 1);
  assert.equal(cases.length, 32);
  for (const bits of cases) {
    const [owned, relay, warn] = run(bits);
    assert.equal(owned, 1, bits.join(''));
    assert.equal(relay, 1, bits.join(''));
    assert.equal(warn, 0, bits.join(''));
  }
});

test('never-relock: whenever OWNED=1, RELAY_ON=1 (incl. TAMPER=1, STATE_VALID=0, no credit)', () => {
  for (const bits of ALL) {
    const [owned, relay] = run(bits);
    if (owned) assert.equal(relay, 1, bits.join(''));
  }
});

test('never-relock over time: once OWNED is fed back it stays set through any input sequence', () => {
  // Simulate the device: stored OWNED is set-only and fed into i0.
  let stored = 0;
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 16) & 1;
  let becameOwnedAt = -1;
  for (let t = 0; t < 2000; t++) {
    const bits = [stored, rnd(), rnd(), rnd(), rnd(), rnd()];
    if (t === 500) { bits[1] = 1; bits[4] = 1; } // pay off at t=500
    const [owned, relay] = run(bits);
    if (owned) stored = 1;
    if (stored && becameOwnedAt < 0) becameOwnedAt = t;
    if (becameOwnedAt >= 0) assert.equal(relay, 1, `relocked at t=${t}`);
  }
  assert.ok(becameOwnedAt >= 0 && becameOwnedAt <= 500);
});

test('owned requires authentic state: PAID_OFF without STATE_VALID does not grant ownership', () => {
  for (const bits of ALL.filter((b) => b[0] === 0 && b[1] === 1 && b[4] === 0)) assert.equal(run(bits)[0], 0);
});

test('not owned: tamper or invalid state always locks', () => {
  for (const bits of ALL.filter((b) => b[0] === 0 && !(b[1] && b[4]))) {
    if (bits[5] === 1 || bits[4] === 0) assert.equal(run(bits)[1], 0, bits.join(''));
  }
});

test('named scenarios', () => {
  //            OP PO CA IG SV T
  assert.deepEqual(run([0, 0, 1, 1, 1, 0]), [0, 1, 0]); // active
  assert.deepEqual(run([0, 0, 0, 1, 1, 0]), [0, 1, 1]); // grace -> on + warning
  assert.deepEqual(run([0, 0, 0, 0, 1, 0]), [0, 0, 0]); // locked
  assert.deepEqual(run([0, 1, 0, 0, 1, 0]), [1, 1, 0]); // just paid off
  assert.deepEqual(run([1, 0, 0, 0, 0, 1]), [1, 1, 0]); // owned, even with tamper + no state
  assert.deepEqual(run([0, 0, 1, 1, 1, 1]), [0, 0, 0]); // tampered while renting
});

test('build artifact matches generator (run `npm run build` after changing gates)', () => {
  const art = JSON.parse(readFileSync(new URL('../build/lockout.json', import.meta.url)));
  assert.equal(art.netlist, bytesToHex(bytes));
  assert.equal(art.netlistHash, netlistHash(bytes));
});
