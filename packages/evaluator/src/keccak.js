// keccak256 (the Ethereum variant: Keccak-f[1600], rate 1088, padding 0x01 ... 0x80).
// Zero dependencies. Written with 32-bit halves so it ports line-for-line to C/C++
// (on the ESP32 use uint64_t lanes directly; the round structure is identical).

const RC_HI = new Uint32Array([
  0x00000000, 0x00000000, 0x80000000, 0x80000000, 0x00000000, 0x00000000, 0x80000000, 0x80000000,
  0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x80000000, 0x80000000, 0x80000000,
  0x80000000, 0x80000000, 0x00000000, 0x80000000, 0x80000000, 0x80000000, 0x00000000, 0x80000000,
]);
const RC_LO = new Uint32Array([
  0x00000001, 0x00008082, 0x0000808a, 0x80008000, 0x0000808b, 0x80000001, 0x80008081, 0x00008009,
  0x0000008a, 0x00000088, 0x80008009, 0x8000000a, 0x8000808b, 0x0000008b, 0x00008089, 0x00008003,
  0x00008002, 0x00000080, 0x0000800a, 0x8000000a, 0x80008081, 0x00008080, 0x80000001, 0x80008008,
]);
// Rotation offsets r[x + 5y] and pi lane permutation.
const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];

function keccakF(hi, lo) {
  const bh = new Uint32Array(25);
  const bl = new Uint32Array(25);
  const ch = new Uint32Array(5);
  const cl = new Uint32Array(5);
  for (let round = 0; round < 24; round++) {
    // theta
    for (let x = 0; x < 5; x++) {
      ch[x] = hi[x] ^ hi[x + 5] ^ hi[x + 10] ^ hi[x + 15] ^ hi[x + 20];
      cl[x] = lo[x] ^ lo[x + 5] ^ lo[x + 10] ^ lo[x + 15] ^ lo[x + 20];
    }
    for (let x = 0; x < 5; x++) {
      const nh = ch[(x + 1) % 5];
      const nl = cl[(x + 1) % 5];
      // rotl64(c[x+1], 1)
      const rh = (nh << 1) | (nl >>> 31);
      const rl = (nl << 1) | (nh >>> 31);
      const dh = ch[(x + 4) % 5] ^ rh;
      const dl = cl[(x + 4) % 5] ^ rl;
      for (let y = 0; y < 25; y += 5) {
        hi[y + x] ^= dh;
        lo[y + x] ^= dl;
      }
    }
    // rho + pi
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const i = x + 5 * y;
        const r = ROT[i];
        let h = hi[i];
        let l = lo[i];
        if (r >= 32) {
          const t = h; h = l; l = t;
        }
        const s = r % 32;
        let oh = h;
        let ol = l;
        if (s !== 0) {
          oh = (h << s) | (l >>> (32 - s));
          ol = (l << s) | (h >>> (32 - s));
        }
        const j = y + 5 * ((2 * x + 3 * y) % 5);
        bh[j] = oh;
        bl[j] = ol;
      }
    }
    // chi
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) {
        hi[y + x] = bh[y + x] ^ (~bh[y + ((x + 1) % 5)] & bh[y + ((x + 2) % 5)]);
        lo[y + x] = bl[y + x] ^ (~bl[y + ((x + 1) % 5)] & bl[y + ((x + 2) % 5)]);
      }
    }
    // iota
    hi[0] ^= RC_HI[round];
    lo[0] ^= RC_LO[round];
  }
}

/** keccak256 of a Uint8Array. Returns a 32-byte Uint8Array. */
export function keccak256Bytes(data) {
  const RATE = 136;
  const hi = new Uint32Array(25);
  const lo = new Uint32Array(25);
  const padded = new Uint8Array((Math.floor(data.length / RATE) + 1) * RATE);
  padded.set(data);
  padded[data.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;
  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE / 8; i++) {
      const p = off + i * 8;
      lo[i] ^= padded[p] | (padded[p + 1] << 8) | (padded[p + 2] << 16) | (padded[p + 3] << 24);
      hi[i] ^= padded[p + 4] | (padded[p + 5] << 8) | (padded[p + 6] << 16) | (padded[p + 7] << 24);
    }
    keccakF(hi, lo);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    out[i * 8 + 0] = lo[i] & 0xff;
    out[i * 8 + 1] = (lo[i] >>> 8) & 0xff;
    out[i * 8 + 2] = (lo[i] >>> 16) & 0xff;
    out[i * 8 + 3] = (lo[i] >>> 24) & 0xff;
    out[i * 8 + 4] = hi[i] & 0xff;
    out[i * 8 + 5] = (hi[i] >>> 8) & 0xff;
    out[i * 8 + 6] = (hi[i] >>> 16) & 0xff;
    out[i * 8 + 7] = (hi[i] >>> 24) & 0xff;
  }
  return out;
}
