# Verification log

What was checked, how, and what is still open. Anything not listed as **verified** here must not be stated as fact on the site.

_Last updated: 2026-11-25._

## Environment note

The build container for this milestone **cannot reach X Layer RPC** (`rpc.xlayer.tech` and `xlayerrpc.okx.com` are blocked by its network policy) or OKLink. All on-chain checks below that need a live read are therefore **pending** and are scripted so you can run them:

```bash
node circuit/scripts/verify-live.js                       # decoder vs live eval() on real X Layer circuits
XLAYER_RPC=https://rpc.xlayer.tech forge test --root contracts --match-contract Fork -vv
```

`verify-live.js` writes its results to `docs/verification/live-*.json`. Commit that file once it passes.

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
- The same bytes run inside the Solidity `MockProcessor` in the contract tests, and `status()` is fuzz-checked against the formulas (512 runs).

## 4. Addresses and fees (X Layer, 196)

| Item | Value | Status |
|---|---|---|
| Processor factory | `0x1f09DAeFA827f02CBb40967cc91b259763760761` | from TAP-10 *Deployments* (read by its authors 2026-09-27). Not re-read by us. **TODO: verify** |
| Factory sealed? | No, per TAP-10 at that time. Processors are beacon proxies, so circuits are **upgradeable by the factory owner** | from TAP-10. Supports our "pinned and verifiable, not immutable" wording |
| USDT0 | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736`, 6 decimals | **TODO: verify** on OKLink. The fork test asserts code exists and `decimals()==6` |
| `createCPU(string,string,string,uint256,uint256)`, `deployFee()` | from `xm1319/tapemkt` | **TODO: verify** |
| Transistor `mint(uint256 id, uint256 amount)`, id 0 = NAND | from `xm1319/tapemkt` | **TODO: verify** |
| Fees: deploy 0.0066 OKB, tape-out 0.0013 OKB, NAND 0.0001 OKB each, protocol 0.00066 OKB per mint | measured by `xm1319/tapemkt` (2026-10) | **TODO: verify**. `plan-tapeout.js` reads them live when RPC is reachable |
| Estimated total for our circuit (own processor) | ≈ 0.0105 OKB + gas | estimate from the unverified figures above |

## 5. Conflicts found between sources

1. **Output buffering.** `xm1319/tapemkt` NETLIST-FORMAT.md says the contract appends 2 buffer NANDs per output at tape-out. TAP-02 (§4, §6, verified source) says outputs are simply the last nOut signals and `tapeout` burns exactly the top-level gate count. **We follow TAP-02.** Our circuit is unaffected either way: identity buffers don't change values, and `verify-live.js` will show which is true.
2. **Is TAP-02 available?** `Tajudeeen/netlist` comments say it was removed. It is present in `TapeOutProtocol/TAPs` as of today.
3. **Tape-out fee.** TAP-02 cites 0.0002 BNB on BSC. On X Layer the reported value is 0.0013 OKB. Different chains, so this is not a contradiction, but read `TAPEOUT_FEE` live before sending (`msg.value` must match exactly).
