import { useEffect, useMemo, useState } from 'react';
import { inputBitsFrom, loadCircuit, evaluateWithSignals, artifact } from '../lib/circuit.js';

const DAY = 86400;
export const DEMO_TERMS = { price: 30_000_000n, dailyRate: 1_000_000n, graceDays: 3 }; // 30 USDT, 1 USDT/day

/**
 * A browser-only device + payment ledger, using the same rules as FairSwitchRegistry
 * and the same circuit bytes as the chain. Everything here is DEMO state.
 */
export function useSimDevice() {
  const [start] = useState(() => Math.floor(Date.now() / 1000));
  const [dayOffset, setDayOffset] = useState(0);
  const [ledger, setLedger] = useState({ totalPaid: 0n, paidUntil: 0, payments: [] });
  const [ownedNvs, setOwnedNvs] = useState(false); // set-only, like the ESP32's NVS flag
  const [tamper, setTamper] = useState(false);
  const [online, setOnlineState] = useState(true);
  const [seen, setSeen] = useState(null); // ledger snapshot the device last received (while offline)
  const circuit = useMemo(() => loadCircuit(artifact.netlist), []);

  const now = start + Math.round(dayOffset * DAY);

  const deviceLedger = online || !seen ? ledger : seen;
  const setOnline = (on) => { setSeen(on ? null : ledger); setOnlineState(on); };
  const bits = inputBitsFrom({
    ownedPrev: ownedNvs, totalPaid: deviceLedger.totalPaid, price: DEMO_TERMS.price,
    paidUntil: deviceLedger.paidUntil, graceDays: DEMO_TERMS.graceDays, now, tamper,
  });
  const { outputs, signals } = evaluateWithSignals(circuit, bits);
  const [owned, relayOn, graceWarning] = outputs.map(Boolean);
  useEffect(() => { if (owned) setOwnedNvs(true); }, [owned]); // persist: only ever set, never cleared

  const pay = (amount) => {
    if (ownedNvs || owned) return 0n;
    const remaining = DEMO_TERMS.price - ledger.totalPaid;
    const accepted = amount > remaining ? remaining : amount;
    const startAt = Math.max(now, ledger.paidUntil);
    const paidUntil = startAt + Number((accepted * BigInt(DAY)) / DEMO_TERMS.dailyRate);
    setLedger((l) => ({ totalPaid: l.totalPaid + accepted, paidUntil, payments: [...l.payments, { at: now, amount: accepted }] }));
    return accepted;
  };

  const reset = () => {
    setLedger({ totalPaid: 0n, paidUntil: 0, payments: [] }); setOwnedNvs(false); setTamper(false);
    setDayOffset(0); setOnlineState(true); setSeen(null);
  };

  return {
    terms: DEMO_TERMS, now, start, dayOffset, setDayOffset, ledger, deviceLedger, ownedNvs, tamper, setTamper,
    online, setOnline, pending: online ? 0n : ledger.totalPaid - deviceLedger.totalPaid,
    bits, outputs, signals, owned, relayOn, graceWarning, pay, reset,
  };
}
