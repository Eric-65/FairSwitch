# Verification log

What was checked, how, and what is still open. Anything not listed as **verified** here must not be stated as fact on the site.

_Last updated: 2026-11-28 (live reads at X Layer block ≈77,103,959)._

## How to re-run

```bash
NODE_USE_ENV_PROXY=1 node circuit/scripts/verify-live.js      # NODE_USE_ENV_PROXY only behind an HTTPS proxy
cd contracts && XLAYER_RPC=https://rpc.xlayer.tech forge test --match-contract Fork -vv
```

Live reports are committed under `docs/verification/`.

## 1. TAP-02 spec

| Item | Status | Evidence |
|---|---|---|
| TAP-02 exists and defines the format | **verified** (document) | `TapeOutProtocol/TAPs` → `TAPs/TAP-02.md`, status *Draft*, updated 2026-10-04. Note: `Tajudeeen/netlist` says it had disappeared from the repo. It is present again. |
| Records: NAND `00 a:u24 b:u24`, LATCH `01 d:u24`, REF `02 cpu:20 id:u64 nIns nOuts ins…`, big-endian | **verified** (spec + official vectors) | TAP-02 §2. Our decoder round-trips every vector byte-for-byte. |
| Outputs are the **last nOut signals** | **verified** (spec + vectors) | TAP-02 §4.4 |
| Bit packing LSB-first; lenient input reading | **verified** (spec + vectors) | TAP-02 §5, `packingEdgeCases` |
| `eval` **reverts for circuits with LATCH state** ("has latch: use step") | **verified** (spec text) | TAP-02 §6. This is why our default circuit is stateless (see SPEC §3). |
| Selectors `netlist 0x3fc4be56`, `eval 0x934d06ea`, `circuitInfo 0x084d60f1`, `step 0xe8281a1a`, `tapeout 0x7bd3ac1d` | **verified** (computed) | `packages/evaluator/test/keccak.test.js` recomputes them with our keccak. |
| TAP-02's chain comparison covers **BNB Smart Chain only** | **noted** | TAP-02 *Deployments*: the X Layer contracts "have not been compared with the text". We close that gap with `verify-live.js`. |
| Official vector file is authentic | **verified** | SHA-256 `1a02f5cf…203b` matches the value printed in TAP-02. The check is in the test. |

## 2. Evaluator (`packages/evaluator`)

| Check | Result |
|---|---|
| TAP-02 valid vectors: `nand`, `constants`, `popcount8_3151` (real on-chain bytes, BSC #3151, all 256 inputs), `toggle` (LATCH), `ref_with_state` (REF + state) | **pass** |
| TAP-02 ill-formed vectors (8) all rejected | **pass** |
| Packing edge cases (5) | **pass** |
| keccak256 vs `@noble/hashes`, 0–600 byte inputs, across the 136-byte rate boundary | **pass** |
| 9 X Layer netlists **recorded by a third party** (`Tajudeeen/netlist`, block 76,412,310): decode → re-encode is byte-exact; gateCount/nState match the recorded `circuitInfo` | **pass**. This is a recording, not a live read. |
| Live: decode X Layer `netlist()` → local eval == on-chain `eval()` | **PENDING**: run `verify-live.js` (default targets: OrderGuard `0x57F3…A355` #3, #4; `0x839b…574e` #1) |

## 3. Lockout circuit (`circuit/`)

- 19 NAND, 133 bytes, nIn 6, nOut 3, nState 0, no REF (flat, as X Layer builders report is required).
- netlist: `0x00000003000006000000020000020000000900000800000004000004000000050000050000000b00000c000000070000070000000600000e0000000f00000f0000001000000d0000000a00000a00000012000006000000130000130000000b0000050000001500001500000014000016000000120000120000001200001100000017000017`
- **keccak256(netlist) = `0xd0b1c483d80c233f7b4988ae5cc8029d5b6708610e2b829cbcfbf31248b9b1eb`**
- Exhaustive: 64/64 inputs equal the reference formulas (both through `beat` and through the packed `eval` path).
- Never-relock: 32/32 with OWNED_PREV=1 → RELAY_ON=1; every row with OWNED=1 has RELAY_ON=1; 2,000-step random device simulation with set-only stored OWNED never relocks.
- **Mainnet-fork rehearsal (real TapeOut implementation, nothing broadcast):** `contracts/test/ForkTapeout.t.sol` creates a processor, mints 19 NAND, tapes out our netlist and gets `circuitInfo` = (6, 3, 0, 19) with the netlist stored byte-exact. **All 64 inputs through the real on-chain `eval()` equal the formulas.** `ForkPathB.t.sol` does the same on the existing OrderGuard processor.
- The same bytes run inside the Solidity `MockProcessor` in the contract tests, and `status()` is fuzz-checked against the formulas (512 runs).

## 4. Addresses and fees (X Layer, 196), read 2026-11-28

| Item | Value | Status |
|---|---|---|
| Processor factory (UUPS proxy) | `0x1f09DAeFA827f02CBb40967cc91b259763760761` | **verified** live (`isCPU`, `cpuCount` = 458) |
| Factory implementation (ERC-1967 slot) | `0x336e9F0F4c3fEe7C8c803377e4DEA00293f4ae2a` | **verified** live. **Differs from TAP-10** (`0x7495…d17b`): the factory has been upgraded since TAP-10 was written |
| Factory owner / sealed | owner `0xB3D85b42A045c1A88D800CAD0F55d2566a4D3138`, `isSealed()` = false | **verified** live. Circuits are upgradeable, so we say "pinned and verifiable", never "immutable" |
| USDT0 | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736`, name/symbol "USD₮0", 6 decimals | **verified** live + OKLink (listed as USD₮0 / Tether USD) |
| `createCPU(string,string,string,uint256,uint256)` | selector `0x47f9b5fd`, **now non-payable** | **verified** on fork |
| Deploy fee | `deployFee()` = 10,000,000 base units of **BEM** (`0x60e62Efa9405d6873C5deaBD4E6CC91c25363952`, 8 decimals) = **0.1 BEM**, pulled with `transferFrom` | **verified** on fork. Earlier reports of "0.0066 OKB" are out of date |
| Max transistor price on a new processor | 1e12 (getter `0x8efc9196`; "price too high" above it) | **verified** live |
| New processor's transistors | `mint(0, n)`, paid in BEM: n × our mintPrice + protocolFee (0.01 BEM) | **verified** on fork |
| Existing processor (OrderGuard) transistors | payable in OKB: mintPrice 0.0001 OKB, protocolFee 0.00066 OKB | **verified** on fork |
| `TAPEOUT_FEE` | 0.0013 OKB (native, exact `msg.value`) | **verified** live |
| **Cost: option A, own processor** | 0.3 BEM (0.1 deploy + 0.19 transistors that go to us as owner + 0.01 protocol) + 0.0013 OKB + gas | from fork rehearsal |
| **Cost: option B, existing processor (OrderGuard)** | 0.00386 OKB + gas | from fork rehearsal |
| What BEM is and where to get it | unknown | **TODO**: not researched. Don't use option A until we know |

## 5. Conflicts found between sources

1. **Output buffering.** `xm1319/tapemkt` NETLIST-FORMAT.md says the contract appends 2 buffer NANDs per output at tape-out. TAP-02 (§4, §6, verified source) says outputs are simply the last nOut signals and `tapeout` burns exactly the top-level gate count. **We follow TAP-02.** Our circuit is unaffected either way: identity buffers don't change values, and `verify-live.js` will show which is true.
2. **Is TAP-02 available?** `Tajudeeen/netlist` comments say it was removed. It is present in `TapeOutProtocol/TAPs` as of today.
3. **Factory upgraded.** TAP-10 lists implementation `0x7495…d17b`. The live slot is `0x336e…ae2a`, and fees moved from OKB to the BEM token. This is exactly the upgradeability TAP-10 warns about, and it's why devices pin the netlist hash.
4. **Tape-out fee.** TAP-02 cites 0.0002 BNB on BSC. On X Layer it is 0.0013 OKB (verified). Read `TAPEOUT_FEE` live before sending (`msg.value` must match exactly).
