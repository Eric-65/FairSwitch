// TAP-02 "Circuit Netlist Format and Evaluation Semantics" — decoder, encoder,
// well-formedness check and one-beat evaluator.
//
// Mirrors the TAP-02 reference implementation (assets/tap-02/reference.py, MIT)
// structure-for-structure. Zero dependencies. Uses flat typed arrays and plain
// loops so it ports 1:1 to C++ for the ESP32 firmware.
//
// Signals: 0 = const 0, 1 = const 1, 2..2+nIn-1 = inputs, then element outputs
// in record order. Outputs are the LAST nOut signals.
// Records (big-endian):
//   0x00 NAND  a:u24 b:u24                                         7 bytes
//   0x01 LATCH d:u24                                               4 bytes
//   0x02 REF   cpu:20 id:u64 nIns:u8 nOuts:u8 ins:u24*nIns   31 + 3*nIns bytes

export const OP_NAND = 0x00;
export const OP_LATCH = 0x01;
export const OP_REF = 0x02;

export const MAX_SIGNALS = 1 << 24;
export const MAX_PINS = 1 << 16;
export const MAX_GATES = 0xffffffff;

export class IllFormed extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'IllFormed';
  }
}

function u24(data, p) {
  return (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
}

/**
 * Decode netlist bytes into elements. Checks record completeness and opcodes
 * (TAP-02 §3 condition 1) before reading each field (§7 requirement 2).
 * Element: { op, ins: number[], firstOut, nOut, cpu?: Uint8Array(20), id?: bigint }
 */
export function decode(data, nIn) {
  const els = [];
  let p = 0;
  let next = 2 + nIn;
  const need = (k) => {
    if (p + k > data.length) throw new IllFormed(`truncated record at byte ${p}`);
  };
  while (p < data.length) {
    const op = data[p];
    let el;
    if (op === OP_NAND) {
      need(7);
      el = { op, ins: [u24(data, p + 1), u24(data, p + 4)], nOut: 1 };
      p += 7;
    } else if (op === OP_LATCH) {
      need(4);
      el = { op, ins: [u24(data, p + 1)], nOut: 1 };
      p += 4;
    } else if (op === OP_REF) {
      need(31);
      const cpu = data.slice(p + 1, p + 21);
      let id = 0n;
      for (let i = 0; i < 8; i++) id = (id << 8n) | BigInt(data[p + 21 + i]);
      const nIns = data[p + 29];
      const nOuts = data[p + 30];
      need(31 + 3 * nIns);
      const ins = [];
      for (let i = 0; i < nIns; i++) ins.push(u24(data, p + 31 + 3 * i));
      el = { op, ins, nOut: nOuts, cpu, id };
      p += 31 + 3 * nIns;
    } else {
      throw new IllFormed(`unknown opcode 0x${op.toString(16).padStart(2, '0')} at byte ${p}`);
    }
    el.firstOut = next;
    next += el.nOut;
    els.push(el);
  }
  return els;
}

/** Encode elements back to netlist bytes (round-trip check / generator output). */
export function encode(els) {
  const out = [];
  const pushU24 = (v) => {
    if (!Number.isInteger(v) || v < 0 || v >= MAX_SIGNALS) throw new RangeError(`u24 out of range: ${v}`);
    out.push((v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  };
  for (const e of els) {
    out.push(e.op);
    if (e.op === OP_REF) {
      for (const b of e.cpu) out.push(b);
      let id = BigInt(e.id);
      const idBytes = [];
      for (let i = 0; i < 8; i++) {
        idBytes.unshift(Number(id & 0xffn));
        id >>= 8n;
      }
      out.push(...idBytes, e.ins.length, e.nOut);
    }
    for (const s of e.ins) pushU24(s);
  }
  return Uint8Array.from(out);
}

const refKey = (cpu, id) => {
  let s = '';
  for (const b of cpu) s += b.toString(16).padStart(2, '0');
  return `${s}#${id}`;
};

/**
 * Decode and check well-formedness (TAP-02 §3). `resolve(cpuBytes, id)` must
 * return a loaded circuit (or null) for REF targets; omit it for flat netlists.
 * Returns a circuit object accepted by `beat`.
 */
export function load(data, nIn, nOut, resolve = null) {
  if (!(Number.isInteger(nIn) && nIn >= 0 && nIn <= MAX_PINS)) throw new IllFormed('too many pins');
  if (!(Number.isInteger(nOut) && nOut >= 1 && nOut <= MAX_PINS)) {
    throw new IllFormed(nOut === 0 ? 'no outputs' : 'too many pins');
  }
  const els = decode(data, nIn);
  let nSignals = 2 + nIn;
  for (const e of els) nSignals += e.nOut;
  if (nSignals > MAX_SIGNALS) throw new IllFormed('more than 2^24 signals');
  if (nSignals - 2 - nIn < nOut) throw new IllFormed('too few signals for outputs');

  const c = { nIn, nOut, elements: els, nSignals, subs: new Map(), nState: 0, nGates: 0, stateBase: [] };
  for (const e of els) {
    const limit = e.op === OP_LATCH ? nSignals : e.firstOut;
    for (const s of e.ins) {
      if (s >= limit) {
        throw new IllFormed(
          e.op === OP_LATCH ? 'LATCH d out of range' : `signal ${s} referenced by element at ${e.firstOut} is not available`,
        );
      }
    }
    c.stateBase.push(c.nState);
    if (e.op === OP_LATCH) {
      c.nState += 1;
      c.nGates += 1;
    } else if (e.op === OP_NAND) {
      c.nGates += 1;
    } else {
      if (!resolve) throw new IllFormed('REF without a resolver');
      const sub = resolve(e.cpu, e.id);
      if (!sub) throw new IllFormed('REF target is not a circuit of a registered processor');
      if (sub.nIn !== e.ins.length || sub.nOut !== e.nOut) throw new IllFormed('REF arity does not match the target circuit');
      if (sub.nState > MAX_SIGNALS) throw new IllFormed('REF size');
      c.subs.set(refKey(e.cpu, e.id), sub);
      c.nState += sub.nState;
      c.nGates += sub.nGates;
    }
  }
  if (c.nState > MAX_SIGNALS || c.nGates > MAX_GATES) throw new IllFormed('size overflow');
  return c;
}

/**
 * One beat (TAP-02 §4). `state` and `inputs` are arrays of 0/1.
 * Returns { newState, outputs } as arrays of 0/1.
 */
export function beat(c, state, inputs) {
  if (state.length !== c.nState) throw new Error('state length mismatch');
  if (inputs.length !== c.nIn) throw new Error('inputs length mismatch');
  const s = new Uint8Array(c.nSignals);
  s[0] = 0;
  s[1] = 1;
  for (let i = 0; i < c.nIn; i++) s[2 + i] = inputs[i] ? 1 : 0;
  const newState = Array.from(state, (v) => (v ? 1 : 0));
  for (let k = 0; k < c.elements.length; k++) {
    const e = c.elements[k];
    const base = c.stateBase[k];
    if (e.op === OP_NAND) {
      s[e.firstOut] = 1 - (s[e.ins[0]] & s[e.ins[1]]);
    } else if (e.op === OP_LATCH) {
      s[e.firstOut] = state[base] ? 1 : 0;
    } else {
      const sub = c.subs.get(refKey(e.cpu, e.id));
      const r = beat(
        sub,
        newState.slice(base, base + sub.nState),
        e.ins.map((x) => s[x]),
      );
      for (let i = 0; i < sub.nState; i++) newState[base + i] = r.newState[i];
      for (let i = 0; i < e.nOut; i++) s[e.firstOut + i] = r.outputs[i];
    }
  }
  for (let k = 0; k < c.elements.length; k++) {
    const e = c.elements[k];
    if (e.op === OP_LATCH) newState[c.stateBase[k]] = s[e.ins[0]];
  }
  const outputs = [];
  for (let i = c.nSignals - c.nOut; i < c.nSignals; i++) outputs.push(s[i]);
  return { newState, outputs };
}

/** Pack bits LSB-first (TAP-02 §5). Returns ceil(n/8) bytes. */
export function pack(bits) {
  const out = new Uint8Array((bits.length + 7) >> 3);
  for (let i = 0; i < bits.length; i++) if (bits[i]) out[i >> 3] |= 1 << (i & 7);
  return out;
}

/** Unpack leniently, like the contracts: missing bytes read as 0, extra bits ignored. */
export function unpack(bytes, n) {
  const bits = [];
  for (let i = 0; i < n; i++) bits.push((i >> 3) < bytes.length ? (bytes[i >> 3] >> (i & 7)) & 1 : 0);
  return bits;
}

/**
 * Same contract as the processor's `eval(id, bytes inputs) -> bytes`:
 * packed inputs in, packed outputs out. Like the chain, refuses circuits with state.
 */
export function evalPacked(c, inputBytes) {
  if (c.nState > 0) throw new Error('has latch: use step');
  return pack(beat(c, [], unpack(inputBytes, c.nIn)).outputs);
}

/** Same contract as `step(id, bytes state, bytes inputs) -> (bytes newState, bytes outputs)`. */
export function stepPacked(c, stateBytes, inputBytes) {
  const r = beat(c, unpack(stateBytes, c.nState), unpack(inputBytes, c.nIn));
  return { newState: pack(r.newState), outputs: pack(r.outputs) };
}
