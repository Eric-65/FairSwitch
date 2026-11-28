# FairSwitch

> Your pay-as-you-go machine runs the exact public rule you can check, offline. Once you've paid it off, it can never relock.

Built for the OKX **X Layer TapeOut Accelerate** hackathon. The lockout rule is a TapeOut NAND circuit on X Layer (chain 196). Devices pin its hash and evaluate the same gates offline. Customers pay in USDT0.

## Status (milestone 1, in progress)

| Part | State |
|---|---|
| `packages/evaluator`: TAP-02 decoder, evaluator, keccak256 (zero deps) | ✅ passes all official TAP-02 vectors |
| `circuit`: 19-NAND lockout netlist, exhaustive 64-case + never-relock tests | ✅ |
| `circuit/scripts/verify-live.js`: decoder vs live X Layer `eval()` | ✅ 16/16 on 3 real circuits |
| `circuit/scripts/plan-tapeout.js`: prints calldata + cost, never broadcasts | ✅ |
| `contracts`: `FairSwitchRegistry` + tests + fork tests | ✅ unit/fuzz + mainnet-fork rehearsal of the full tape-out (64/64 on real `eval`) |
| `web`: React + Vite app | ⏳ waiting for the design reference |
| `firmware` | later |

## Run

```bash
npm install
npm test                         # evaluator + circuit tests
npm run build:circuit            # regenerate circuit/build/lockout.json
node circuit/scripts/plan-tapeout.js [--processor 0x..] [--from 0x..]
NODE_USE_ENV_PROXY=1 node circuit/scripts/verify-live.js   # env var only needed behind an HTTPS proxy
cd contracts && forge test
```

Docs: [SPEC](docs/SPEC.md) · [VERIFICATION](docs/VERIFICATION.md) · [CLAIMS](docs/CLAIMS.md) · [IMAGES](docs/IMAGES.md)

## Credits

- **TAP-02** (TapeOutProtocol/TAPs, CC0): netlist format and semantics. The test vectors are vendored unchanged in `packages/evaluator/test/fixtures/tap02-vectors.json`, and the evaluator mirrors the reference implementation `reference.py` (MIT).
- **Tajudeeen/netlist**: recorded X Layer netlists used as a structural fixture (`xlayer-recorded.json`).
- **xm1319/tapemkt**: X Layer factory/transistor ABIs and fee measurements used in `plan-tapeout.js` (marked unverified).
- **Tolex081/circuitwill**: the idea of pinning `keccak256(processor.netlist(id))`, plus the offline-simulation and fork-test approach.
- **Gemmahadi/gerbang-tapeout**, **lichao01111-dot/rulechip**: read-only RPC and flat-netlist approaches studied.

## Safety

No private keys in this repo, ever. Scripts never broadcast. Mainnet transactions are sent by the maintainer after review.
