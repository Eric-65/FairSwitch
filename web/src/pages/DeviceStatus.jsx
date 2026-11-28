import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import Header from '../components/Header.jsx';
import FloatingCta from '../components/FloatingCta.jsx';
import StatusWord, { stateFrom } from '../components/StatusWord.jsx';
import NumberedList from '../components/NumberedList.jsx';
import VerifyRule from '../components/VerifyRule.jsx';
import WalletButton from '../components/WalletButton.jsx';
import Ring from '../components/Ring.jsx';
import TextLink from '../components/TextLink.jsx';
import Footer from '../components/Footer.jsx';
import { useToast } from '../components/Toaster.jsx';
import { useSimDevice } from '../hooks/useSimDevice.js';
import { useRegistryDevice, registryLive } from '../hooks/useChain.js';
import { ADDR, CHAIN_ID } from '../config.js';
import { erc20Abi, registryAbi } from '../lib/abi.js';
import { toDeviceId } from '../lib/device.js';
import { countdown, usdt, toUsdtUnits, short } from '../lib/format.js';
import './DeviceStatus.css';

const DAY = 86400;

function rules({ price, dailyRate, graceDays }) {
  return [
    { title: 'Pay any amount', desc: `Each ${usdt(dailyRate)} USDT adds one day of use. Payments stack on top of remaining credit.` },
    { title: 'Grace, not surprise', desc: `When credit runs out you get ${graceDays} more day${graceDays === 1 ? '' : 's'} with a warning before anything locks.` },
    { title: 'Locked, never lost', desc: 'After grace the machine pauses. Any payment restarts it from today. Nothing you paid is forgotten.' },
    { title: 'Own it forever', desc: `At ${usdt(price)} USDT total the device is yours. The OWNED bit is set once and the relay can never lock again.` },
  ];
}

export default function DeviceStatus() {
  const { deviceId: raw } = useParams();
  const demo = !registryLive || raw === 'demo';
  const deviceId = useMemo(() => toDeviceId(raw), [raw]);
  const toast = useToast();
  const sim = useSimDevice();
  const chain = useRegistryDevice(demo ? null : deviceId);
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState('1');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000); return () => clearInterval(t); }, []);
  // Demo device starts with 12 USDT paid so every state is one tap away.
  const seeded = useRef(false);
  useEffect(() => {
    if (demo && !seeded.current) { seeded.current = true; sim.pay(12_000_000n); }
  }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps

  let view;
  if (demo) {
    view = {
      terms: sim.terms, totalPaid: sim.ledger.totalPaid, paidUntil: sim.ledger.paidUntil, now: sim.now,
      owned: sim.owned, relayOn: sim.relayOn, graceWarning: sim.graceWarning, bits: sim.bits, operator: null,
    };
  } else if (chain.device.data) {
    const d = chain.device.data;
    const [owned, relayOn, graceWarning] = chain.status.data ?? [d.owned, false, false];
    const b = chain.bits.data ?? 0;
    view = {
      terms: { price: d.price, dailyRate: d.dailyRate, graceDays: d.graceDays }, totalPaid: d.totalPaid,
      paidUntil: Number(d.paidUntil), now, owned, relayOn, graceWarning, operator: d.operator,
      bits: [0, 1, 2, 3, 4, 5].map((i) => (b >> i) & 1),
    };
  }

  const state = view ? stateFrom(view) : 'off';
  const left = view ? view.paidUntil - view.now : 0;
  const graceLeft = view ? view.paidUntil + view.terms.graceDays * DAY - view.now : 0;
  const progress = view ? Math.min(100, Number((BigInt(view.totalPaid) * 1000n) / BigInt(view.terms.price)) / 10) : 0;

  async function payLive(units) {
    const id = 'pay';
    try {
      const allowance = await client.readContract({ address: ADDR.usdt0, abi: erc20Abi, functionName: 'allowance', args: [address, ADDR.registry] });
      if (allowance < units) {
        toast({ key: id, tone: 'pending', title: 'Approve USDT in your wallet…' });
        const h = await writeContractAsync({ chainId: CHAIN_ID, address: ADDR.usdt0, abi: erc20Abi, functionName: 'approve', args: [ADDR.registry, units] });
        toast({ key: id, tone: 'pending', title: 'Approval sent', hash: h });
        await client.waitForTransactionReceipt({ hash: h });
      }
      toast({ key: id, tone: 'pending', title: 'Confirm the payment in your wallet…' });
      const h2 = await writeContractAsync({ chainId: CHAIN_ID, address: ADDR.registry, abi: registryAbi, functionName: 'pay', args: [deviceId, units] });
      toast({ key: id, tone: 'pending', title: 'Payment sent', hash: h2 });
      await client.waitForTransactionReceipt({ hash: h2 });
      toast({ key: id, title: `Paid ${usdt(units)} USDT`, body: 'Status updated from X Layer.', hash: h2 });
      chain.device.refetch(); chain.status.refetch(); chain.bits.refetch();
    } catch (e) {
      toast({ key: id, tone: 'error', title: 'Payment not completed', body: e.shortMessage || e.message });
    }
  }

  function submit(e) {
    e.preventDefault();
    let units;
    try { units = toUsdtUnits(amount); } catch { return toast({ tone: 'error', title: 'Enter an amount like 5 or 2.5' }); }
    if (units <= 0n) return toast({ tone: 'error', title: 'Amount must be above zero' });
    setSheet(false);
    if (demo) {
      const accepted = sim.pay(units);
      return toast({ title: accepted ? `Paid ${usdt(accepted)} USDT (demo)` : 'Already owned' });
    }
    payLive(units);
  }

  const canPayLive = !demo && address && chainId === CHAIN_ID && view && !view.owned;

  return (
    <>
      <Header />
      <main id="main" className="ds">
        <div className="wrap">
          <p className="ds__label">
            device <span className="mono">{raw === 'demo' ? 'demo' : short(deviceId)}</span>
            {demo && <span className="tag">demo — simulated payments</span>}
          </p>

          {!demo && chain.device.isLoading && <p className="ds__loading">Reading device from X Layer…</p>}
          {!demo && chain.device.isError && (
            <div className="empty">
              <p><strong>Device not found.</strong> Check the link from your operator, or try the <TextLink to="/d/demo">demo device</TextLink>.</p>
            </div>
          )}

          {view && (
            <>
              <h1 className="sr-only">Device status</h1>
              <StatusWord state={state} />
              <div className="ds__meters">
                <div className="ds__meter">
                  <p className="micro">{view.owned ? 'paid until' : left > 0 ? 'credit left' : graceLeft > 0 ? 'grace left' : 'credit'}</p>
                  <p className="ds__big num">{view.owned ? '∞' : left > 0 ? countdown(left).text : graceLeft > 0 ? countdown(graceLeft).text : 'expired'}</p>
                </div>
                <div className="ds__meter">
                  <p className="micro">toward ownership</p>
                  <p className="ds__big num">{usdt(view.totalPaid)} <span>/ {usdt(view.terms.price)} USDT</span></p>
                  <div className="progress" role="progressbar" aria-label="Ownership progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {demo && (
                <label className="slider ds__time">
                  <span className="micro">demo time · day {sim.dayOffset.toFixed(1)}</span>
                  <input type="range" min="0" max="30" step="0.25" value={sim.dayOffset} onChange={(e) => sim.setDayOffset(Number(e.target.value))} />
                </label>
              )}

              <section className="ds__rule" aria-labelledby="rule-title">
                <h2 id="rule-title" className="ds__h2"><Ring /> The rule, in plain words</h2>
                <NumberedList items={rules(view.terms)} />
              </section>

              <section className="ds__verify" aria-labelledby="verify-title">
                <h2 id="verify-title" className="ds__h2"><Ring /> Don’t trust — check</h2>
                <p className="ds__p">Fetch the circuit, check its fingerprint, run it here with this device’s current inputs, and compare with X Layer.</p>
                <VerifyRule bits={view.bits} />
              </section>

              {!demo && <div className="ds__wallet"><WalletButton /></div>}
            </>
          )}
        </div>
      </main>
      <Footer />

      {sheet && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
          <form className="sheet__panel" onSubmit={submit}>
            <h2 id="sheet-title" className="sheet__title">Pay with USDT</h2>
            <div className="field">
              <label htmlFor="amt">Amount (USDT)</label>
              <input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              {view && <small>{usdt(view.terms.dailyRate)} USDT = 1 day. Anything above what’s left to own is not taken.</small>}
            </div>
            <div className="sheet__btns">
              <button type="button" className="btn btn--ghost" onClick={() => setSheet(false)}>Cancel</button>
              <button type="submit" className="btn btn--signal">{demo ? 'Pay (demo)' : 'Approve & pay'}</button>
            </div>
          </form>
        </div>
      )}
      {view && !view.owned && (demo || canPayLive) && <FloatingCta onClick={() => setSheet(true)}>Pay with USDT</FloatingCta>}
      {view && !view.owned && !demo && !canPayLive && <FloatingCta onClick={() => document.querySelector('.ds__wallet button')?.focus()}>Connect to pay</FloatingCta>}
    </>
  );
}
