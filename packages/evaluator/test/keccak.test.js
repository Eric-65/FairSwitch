import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keccak_256 } from '@noble/hashes/sha3';
import { keccak256Bytes, bytesToHex, netlistHash } from '../src/index.js';

test('known vectors', () => {
  assert.equal(bytesToHex(keccak256Bytes(new Uint8Array())), '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
  assert.equal(bytesToHex(keccak256Bytes(new TextEncoder().encode('abc'))), '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45');
});

test('function selectors from TAP-02 §6', () => {
  const sel = (s) => bytesToHex(keccak256Bytes(new TextEncoder().encode(s))).slice(0, 10);
  assert.equal(sel('netlist(uint256)'), '0x3fc4be56');
  assert.equal(sel('eval(uint256,bytes)'), '0x934d06ea');
  assert.equal(sel('circuitInfo(uint256)'), '0x084d60f1');
  assert.equal(sel('step(uint256,bytes,bytes)'), '0xe8281a1a');
  assert.equal(sel('tapeout(bytes,uint32,uint32)'), '0x7bd3ac1d');
});

test('matches @noble/hashes on 0..600 byte inputs (crosses the 136-byte rate boundary)', () => {
  for (let n = 0; n <= 600; n += 7) {
    const data = new Uint8Array(n);
    for (let i = 0; i < n; i++) data[i] = (i * 31 + n) & 0xff;
    assert.equal(bytesToHex(keccak256Bytes(data)), bytesToHex(keccak_256(data)), `n=${n}`);
  }
  for (const n of [135, 136, 137, 271, 272, 273]) {
    const data = new Uint8Array(n).fill(0xab);
    assert.equal(bytesToHex(keccak256Bytes(data)), bytesToHex(keccak_256(data)), `n=${n}`);
  }
});

test('netlistHash accepts hex', () => {
  assert.equal(netlistHash('0x'), '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
});
