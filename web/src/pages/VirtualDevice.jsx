import { useState } from 'react';
import { usePublicClient } from 'wagmi';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Header from '../components/Header.jsx';
import FloatingCta from '../components/FloatingCta.jsx';
import StatusWord, { stateFrom } from '../components/StatusWord.jsx';
import Ring from '../components/Ring.jsx';
import TextLink from '../components/TextLink.jsx';
import Footer from '../components/Footer.jsx';
import { useToast } from '../components/Toaster.jsx';
import { useSimDevice } from '../hooks/useSimDevice.js';
import { circuitLive } from '../hooks/useChain.js';
import { ADDR, CHAIN_ID } from '../config.js';
import { processorAbi } from '../lib/abi.js';
import { artifact, hashOf, PINNED_HASH, tamperedNetlist, INPUTS, OUTPUTS } from '../lib/circuit.js';
import { countdown, usdt } from '../lib/format.js';
import './VirtualDevice.css';

const shortHash = (h) => `${h.slice(0, 10)}…${h.slice(-6)}`;

function Bulb({ state }) {
  return (
    <svg className={`bulb bulb--${state}`} viewBox="0 0 120 160" aria-hidden="true">
      <defs>
        <radialGradient id="bulbGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--glow-core)" />
          <stop offset="100%" stopColor="var(--glow-core)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="bulb__halo" cx="60" cy="58" r="58" fill="url(#bulbGlow)" />
      <path className="bulb__glass" d="M40 96 C40 80 22 72 22 52 A38 38 0 0 1 98 52 C98 72 80 80 80 96 Z" />
      <path className="bulb__filament" d="M48 88 L52 58 L58 68 L62 58 L66 68 L72 58 L72 88" />
      <rect className="bulb__base" x="42" y="100" width="36" height="8" rx="2" />
      <rect className="bulb__base" x="44" y="111" width="32" height="7" rx="2" />
      <rect className="bulb__base" x="50" y="121" width="20" height="8" rx="3" />
    </svg>
  );
}

function Bits({ label, names, values, outputs }) {
  return (
    <div className="bits">
      <p className="micro bits__label">{label}</p>
      <ul role="list" className="bits__row">
        {names.map((n, i) => (
          <li key={n} className={`bit ${values[i] ? 'is-on' : ''} ${outputs && i === 1 && values[i] ? 'is-relay' : ''}`}>
            <span className="bit__v num">{values[i]}</span>
            <span className="bit__n">{n.replaceAll('_', ' ').toLowerCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VirtualDevice() {
  const sim = useSimDevice();
  const toast = useToast();
  const reduce = useReducedMotion();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const [pin, setPin] = useState(null); // { hash, source, bytes }
  const [pinning, setPinning] = useState(false);
  const [swap, setSwap] = useState(null); // { hash } when a modified netlist was offered

  const running = !!pin;
  const outputs = running ? sim.outputs : [0, 0, 0];
  const state = !running ? 'off' : stateFrom({ owned: sim.owned, relayOn: sim.relayOn, graceWarning: sim.graceWarning });
  const bulb = !running ? 'off' : sim.relayOn ? (sim.graceWarning ? 'grace' : sim.owned ? 'owned' : 'on') : 'off';
  const left = sim.deviceLedger.paidUntil - sim.now;
  const graceLeft = sim.deviceLedger.paidUntil + sim.terms.graceDays * 86400 - sim.now;
  const progress = Number((sim.ledger.totalPaid * 1000n) / sim.terms.price) / 10;

  async function downloadAndPin() {
    setPinning(true);
    try {
      let hex = artifact.netlist;
      let source = 'local build (not taped out yet)';
      if (circuitLive && sim.online) {
        hex = await client.readContract({ address: ADDR.processor, abi: processorAbi, functionName: 'netlist', args: [ADDR.circuitId] });
        source = `X Layer · processor ${ADDR.processor.slice(0, 8)}… · circuit #${ADDR.circuitId}`;
      }
      await new Promise((r) => setTimeout(r, reduce ? 0 : 700));
      const hash = hashOf(hex);
      if (hash !== PINNED_HASH) throw new Error('Downloaded netlist does not match the expected hash.');
      setPin({ hash, source, bytes: (hex.length - 2) / 2 });
      toast({ title: 'Circuit pinned', body: `${artifact.gateCount} gates · ${shortHash(hash)}` });
    } catch (e) {
      toast({ tone: 'error', title: 'Could not pin the circuit', body: e.shortMessage || e.message });
    } finally {
      setPinning(false);
    }
  }

  function offerTampered() {
    const hash = hashOf(tamperedNetlist());
    setSwap({ hash });
    sim.setTamper(true); // device refuses the swap and raises its TAMPER input
  }
  function restore() { setSwap(null); sim.setTamper(false); }

  function pay(units) {
    const accepted = sim.pay(units);
    if (accepted === 0n) return toast({ title: 'Already owned', body: 'Nothing left to pay — it’s yours.' });
    toast({ title: `Paid ${usdt(accepted)} USDT (demo)`, body: sim.online ? 'Device updated.' : 'Queued — device is offline.' });
  }

  return (
    <>
      <Header />
      <main id="main" className="vd">
        <div className="wrap">
          <header className="vd__intro">
            <p className="vd__label"><span className="tag">demo</span> simulated payments · real circuit bytes</p>
            <h1 className="vd__title">A machine, <span className="serif">in your browser.</span></h1>
          </header>

          <div className="vd__grid">
            {/* ── Product card ── */}
            <section className="vd__card" aria-label="Virtual device">
              <div className="vd__studio">
                <Bulb state={bulb} />
                <div className={`vd__relay ${outputs[1] ? 'is-on' : ''}`} aria-hidden="true">
                  <span className="vd__relay-arm" />
                </div>
              </div>
              <StatusWord state={swap && !sim.owned ? 'refused' : state} size="md" tone="dark" />
              <dl className="vd__lcd">
                <div><dt>circuit</dt><dd>{pin ? `pinned ${shortHash(pin.hash)}` : 'not pinned'}</dd></div>
                <div><dt>network</dt><dd>{sim.online ? 'online' : 'offline — evaluating locally'}</dd></div>
                <div><dt>nvs owned</dt><dd>{sim.ownedNvs ? '1 (set-only)' : '0'}</dd></div>
                <div><dt>credit</dt><dd className="num">{!running ? '—' : sim.owned ? '∞ owned' : left > 0 ? countdown(left).text : graceLeft > 0 ? `grace ${countdown(graceLeft).text}` : 'expired'}</dd></div>
              </dl>
              <AnimatePresence>
                {swap && (
                  <motion.div className="vd__alert" role="alert"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <strong>Hash mismatch — netlist refused.</strong>
                    <span>Expected <span className="mono">{shortHash(PINNED_HASH)}</span>, got <span className="mono">{shortHash(swap.hash)}</span>. TAMPER = 1{sim.owned ? ', but OWNED keeps the relay on.' : ', relay locked.'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {running && (
                <>
                  <Bits label="inputs" names={INPUTS} values={sim.bits} />
                  <Bits label="outputs" names={OUTPUTS} values={outputs} outputs />
                </>
              )}
            </section>

            {/* ── Steps ── */}
            <ol role="list" className="vd__steps">
              <li className="vstep">
                <p className="vstep__no micro">{'{01}'}</p>
                <h2 className="vstep__title">Download &amp; pin circuit —</h2>
                <p className="vstep__desc">The device fetches the netlist once, checks keccak256 against the pinned hash, and keeps its own copy.</p>
                <button className="btn btn--signal" onClick={downloadAndPin} disabled={pinning || !!pin || (circuitLive && !sim.online)}>
                  {pin ? 'Pinned ✓' : pinning ? 'Downloading…' : 'Download & pin'}
                </button>
                {pin && <p className="vstep__note mono">{pin.bytes} bytes · {pin.source}</p>}
              </li>

              <li className={`vstep ${!running ? 'is-locked' : ''}`}>
                <p className="vstep__no micro">{'{02}'}</p>
                <h2 className="vstep__title">Run offline —</h2>
                <p className="vstep__desc">Cut the network. The gates keep running on the device; payments made now arrive when it reconnects.</p>
                <label className="switch">
                  <input type="checkbox" role="switch" checked={!sim.online} disabled={!running} onChange={(e) => sim.setOnline(!e.target.checked)} />
                  <span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
                  <span>{sim.online ? 'Online' : 'Offline'}</span>
                </label>
                {sim.pending > 0n && <p className="vstep__note">{usdt(sim.pending)} USDT waiting to sync</p>}
              </li>

              <li className={`vstep ${!running ? 'is-locked' : ''}`}>
                <p className="vstep__no micro">{'{03}'}</p>
                <h2 className="vstep__title">Pay &amp; fast-forward —</h2>
                <p className="vstep__desc">Price {usdt(sim.terms.price, 0)} USDT · {usdt(sim.terms.dailyRate, 0)} USDT/day · {sim.terms.graceDays} grace days.</p>
                <div className="vstep__btns">
                  <button className="btn" disabled={!running} onClick={() => pay(sim.terms.dailyRate)}>Pay 1 day</button>
                  <button className="btn" disabled={!running} onClick={() => pay(sim.terms.dailyRate * 7n)}>Pay 7 days</button>
                  <button className="btn btn--signal" disabled={!running} onClick={() => pay(sim.terms.price)}>Pay it off</button>
                </div>
                <div className="progress" role="progressbar" aria-label="Ownership" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <p className="vstep__note num">{usdt(sim.ledger.totalPaid)} / {usdt(sim.terms.price)} USDT toward ownership</p>
                <label className="slider">
                  <span className="micro">Time · day {sim.dayOffset.toFixed(1)}</span>
                  <input type="range" min="0" max="45" step="0.25" value={sim.dayOffset} disabled={!running}
                    onChange={(e) => sim.setDayOffset(Number(e.target.value))} aria-valuetext={`day ${sim.dayOffset}`} />
                  <span className="slider__marks" aria-hidden="true"><span>active</span><span>grace</span><span>locked</span></span>
                </label>
              </li>

              <li className={`vstep ${!running ? 'is-locked' : ''}`}>
                <p className="vstep__no micro">{'{04}'}</p>
                <h2 className="vstep__title">Tamper test —</h2>
                <p className="vstep__desc">Swap in a netlist with one wire moved. Its hash won’t match, so the device refuses it and raises TAMPER.</p>
                {swap ? (
                  <button className="btn" onClick={restore}>Restore original</button>
                ) : (
                  <button className="btn btn--alert" disabled={!running} onClick={offerTampered}>Swap in modified netlist</button>
                )}
              </li>
            </ol>
          </div>

          <div className="vd__foot">
            <button className="btn btn--ghost" onClick={() => { sim.reset(); restore(); }}>Reset simulation</button>
            <TextLink to="/circuit">view circuit</TextLink>
            <TextLink to="/d/demo">device status page</TextLink>
            <p className="vd__honest"><Ring size={0.8} /> Payments here are simulated in your browser. The circuit bytes and evaluator are the real ones — the same bytes that get taped out on X Layer.</p>
          </div>
        </div>
      </main>
      <Footer />
      <FloatingCta onClick={() => (running ? pay(sim.terms.dailyRate) : downloadAndPin())}>
        {running ? 'Pay with USDT' : 'Start device'}
      </FloatingCta>
    </>
  );
}
