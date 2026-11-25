# FairSwitch — product & circuit spec

**One-liner.** Your pay-as-you-go machine runs the exact public rule you can check, offline. Once you've paid it off, it can never relock.

## 1. Problem

PAYG machines (solar kits, freezers, laundry machines, battery packs, e-bikes) are locked remotely when a payment is missed. The rule (grace days, partial payments, what happens after payoff) lives on a private server or in closed firmware and can change silently. In one survey of 1,327 customers, interest in PAYG fell from 63% to 40% once lockouts were explained (L-IFT survey, reported by CGAP. Source link: TODO, add to CLAIMS.md before publishing).

## 2. Solution

- The lockout rule is a **public TapeOut circuit on X Layer** (flat NAND netlist).
- The device controller (ESP32 later; a browser "virtual device" now) downloads the netlist once, **pins its keccak256 hash**, and evaluates the same gates locally and offline with a TAP-02 evaluator.
- Customers pay **USDT0 on X Layer** to `FairSwitchRegistry`. Funds go straight to the operator.
- When cumulative payments reach the price, `OWNED` is set. The device stores it in non-volatile memory, set-only, and the circuit guarantees `RELAY_ON = 1` whenever `OWNED_PREV = 1`.

### What we do NOT claim
- That payment-switched relays are new (LNbits switches and OpenPAYGO exist).
- That TapeOut circuits are immutable. Processors are beacon proxies and the factory is not sealed (TAP-10), so the right word is **pinned and verifiable**: the device pins the hash and runs its own evaluator, and `ruleIntact()` shows on chain whether the stored netlist still matches.
- That a circuit can stop physical rewiring.
- Any number not read from chain or labelled "demo".

## 3. The lockout circuit

| Bit | Input | Meaning |
|---|---|---|
| i0 | OWNED_PREV | stored owned flag, fed back |
| i1 | PAID_OFF | totalPaid ≥ price |
| i2 | CREDIT_ACTIVE | now < paidUntil |
| i3 | IN_GRACE | now < paidUntil + graceDays |
| i4 | STATE_VALID | payment state is authentic |
| i5 | TAMPER | netlist hash mismatch / tamper flag |

| Bit | Output | Logic |
|---|---|---|
| o0 | OWNED | OWNED_PREV ∨ (PAID_OFF ∧ STATE_VALID) |
| o1 | RELAY_ON | OWNED ∨ (STATE_VALID ∧ ¬TAMPER ∧ (CREDIT_ACTIVE ∨ IN_GRACE)) |
| o2 | GRACE_WARNING | ¬OWNED ∧ STATE_VALID ∧ ¬CREDIT_ACTIVE ∧ IN_GRACE |

Implementation: `circuit/src/lockout.js`, 19 NAND (signals 8–26), outputs are the last three signals. Netlist hash: see `docs/VERIFICATION.md` §3.

### 3.1 LATCH alternative (proposal, not the default)

TAP-02 supports a LATCH whose `d` may point forward, so `OWNED` could live inside the circuit: `owned_q = LATCH(d = OWNED)`, `OWNED = owned_q ∨ (PAID_OFF ∧ STATE_VALID)`. This is one LATCH + 1 NAND more, and it would drop the i0 input.

**Recommendation: keep the feedback-bit version.** Reasons:
1. `eval()` **reverts for circuits with state** ("has latch: use step", TAP-02 §6), so the free `eval` mirror in `status()` would have to use `step(id, state, inputs)` with state supplied by the caller. The state would still come from our contract or the device, so nothing is gained on chain.
2. The stateless version is fully covered by 64 cases. A sequential one needs sequence/induction arguments.
3. On the ESP32 the latch still has to be persisted to flash across power loss, which is exactly what the feedback bit already does.

## 4. FairSwitchRegistry

- `registerDevice(deviceId, price, dailyRate, graceDays, processor, circuitId, netlistHash)`. Terms are **immutable** after registration.
- `pay(deviceId, amount)`. Pulls `min(amount, price − totalPaid)` from the payer straight to the operator (the excess is never taken). Extends `paidUntil = max(now, paidUntil) + accepted·1 day / dailyRate`, sets `owned` at payoff, and emits `Paid`.
- `inputBits(deviceId)`. The packed byte for `eval` (STATE_VALID = 1, TAMPER = 0 on chain).
- `status(deviceId)`. Calls `processor.eval(circuitId, inputBits)`.
- `ruleIntact(deviceId)`. Checks `keccak256(processor.netlist(circuitId)) == netlistHash`.
- `deviceCount()`, `totalVolume()`. Live stats for the landing page.

## 5. Users and business

- **Operators**: PAYG businesses and owners of shared machines. They register devices, set fair terms and receive USDT0 directly.
- **Customers**: they pay USDT0, see their status, and verify the rule.
- Revenue model, go-to-market and retention: TODO (submission write-up, later prompt).
