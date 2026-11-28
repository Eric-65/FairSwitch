# Public claims and their evidence

Every sentence the site or submission states as fact must have a row here. Status: ✅ evidenced · ⏳ pending · ❌ do not use.

| Claim | Evidence | Status |
|---|---|---|
| "Inputs proven: 64/64" | `circuit/test/lockout.test.js` exhaustive test | ✅ |
| "Relocks after payoff: 0" | Never-relock tests (circuit + `testFuzz_neverRelock`). State it as "0 in 64/64 cases plus fuzzing", not as an observation of real devices | ✅ (worded as tested) |
| "The rule is a public circuit on X Layer" | Needs processor address + circuit id after tape-out | ⏳ |
| "Your device checks the same circuit" | Netlist hash pinned. Our decoder == on-chain eval (16/16 live, 64/64 on fork for our circuit) | ✅ |
| "Payments go straight to the operator" | `pay()` transfers payer→operator. `test_active_afterPayment` asserts the registry balance stays 0 | ✅ |
| "Overpayments are never taken" | `test_overpay_onlyRemainingIsTaken` | ✅ |
| "Terms can't be changed after registration" | No setter in `FairSwitchRegistry` | ✅ |
| Devices registered / USDT paid | Live `deviceCount()` / `totalVolume()` once deployed; "demo" label until then | ⏳ |
| 63% → 40% interest after lockouts explained (n = 1,327) | L-IFT survey via CGAP. Need the exact link | ⏳ |
| "Immutable" | TapeOut processors are upgradeable (TAP-10) | ❌ use "pinned and verifiable" |
| "First payment-controlled relay" | LNbits, OpenPAYGO | ❌ |
| "Prevents rewiring" | Physically impossible | ❌ |
