import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import FloatingCta from '../components/FloatingCta.jsx';
import FluidCanvas from '../components/FluidCanvas.jsx';
import CrosshairGrid from '../components/CrosshairGrid.jsx';
import Ring from '../components/Ring.jsx';
import Wordmark from '../components/Wordmark.jsx';
import Picture from '../components/Picture.jsx';
import RevealText from '../components/RevealText.jsx';
import Statement from '../components/Statement.jsx';
import NumberedList from '../components/NumberedList.jsx';
import SectionLabel from '../components/SectionLabel.jsx';
import TextLink from '../components/TextLink.jsx';
import Footer from '../components/Footer.jsx';
import { useRegistryStats, registryLive } from '../hooks/useChain.js';
import { useTransitionNavigate } from '../lib/viewTransition.js';
import { usdt } from '../lib/format.js';
import { artifact } from '../lib/circuit.js';
import './Landing.css';

const COLLAGE = [
  { slot: 'collage-solar', subject: 'solar', mood: 'aqua', caption: 'Solar Home Kit', cls: 'c1', speed: 18 },
  { slot: 'collage-freezer', subject: 'freezer', mood: 'black', caption: 'Chest Freezer', cls: 'c2', speed: -12 },
  { slot: 'collage-battery', subject: 'battery', mood: 'ember', caption: 'E-bike Battery', cls: 'c3', speed: 26 },
  { slot: 'collage-laundry', subject: 'laundry', mood: 'neutral', caption: 'Laundry Machine', cls: 'c4', speed: -8 },
  { slot: 'collage-esp32', subject: 'esp32', mood: 'black', caption: 'ESP32 + Relay', cls: 'c5', speed: 14 },
];

const PANELS = [
  { slot: 'panel-solar', subject: 'solar', mood: 'aqua', label: 'Energy', title: 'Solar Home Kits', sub: 'Pay daily, own it in months' },
  { slot: 'panel-freezer', subject: 'freezer', mood: 'black', label: 'Cold storage', title: 'Shared Freezers', sub: 'Pay per day, rules on display' },
  { slot: 'panel-ebike', subject: 'battery', mood: 'ember', label: 'Mobility', title: 'E-bike Batteries', sub: 'Swap, pay, ride' },
];

const STEPS = [
  { title: 'Pay', desc: 'USDT on X Layer, straight to the operator.', items: ['Any amount, any day', 'Overpayment is never taken', 'Every payment is a public event'] },
  { title: 'Verify', desc: 'Fetch the public circuit and check its fingerprint.', items: ['netlist() from the TapeOut processor', 'keccak256 must match the pinned hash', 'Compare with on-chain eval()'] },
  { title: 'Run offline', desc: 'The device evaluates the same gates itself.', items: [`${artifact.gateCount} NAND gates, no server`, 'Same inputs, same outputs', 'Works with the network down'] },
  { title: 'Own forever', desc: 'Once paid off, the latch never resets.', items: ['OWNED is stored set-only', 'RELAY_ON = 1 for every other input', 'Proven over all 64 cases'] },
];

const FAQ = [
  ['What happens if I miss a payment?', 'Your credit runs out, then a grace window starts (set by the operator when the device is registered, e.g. 3 days). The machine keeps running and warns you during grace. After grace, it locks until you top up — any amount restarts it from today.'],
  ['Can the operator change the rule later?', 'Not silently. Price, daily rate and grace days are fixed in the registry contract when a device is registered — there is no function to edit them. The lockout logic is a public TapeOut circuit, and the device pins its keccak256 hash: if the netlist ever changed, the device would refuse it.'],
  ['Is the circuit immutable?', 'No, and we don’t claim it is. TapeOut processors are upgradeable by the protocol. That is exactly why the device pins the netlist hash and runs its own evaluator: it keeps running the rule you agreed to, and anyone can check whether the on-chain copy still matches.'],
  ['What does “owned forever” mean?', 'When cumulative payments reach the price, the OWNED bit turns on. The device stores it in non-volatile memory and only ever sets it. With OWNED = 1, the circuit outputs RELAY_ON = 1 for every combination of the other inputs — we test all 64.'],
  ['Does the machine need internet?', 'Only to pick up new payment state. The rule itself runs locally on the controller, so a dropped connection never switches anything off by itself.'],
  ['Can someone just rewire the machine?', 'A circuit cannot stop physical tampering, and we don’t pretend it does. FairSwitch makes the rule public and verifiable; hardware security is a separate problem.'],
  ['Why only USDT?', 'One stable asset keeps prices readable for customers and accounting simple for operators. Payments use USDT0 on X Layer, with low fees and fast confirmation.'],
];

function Stat({ label, value, live, note, volt }) {
  return (
    <div className="stat">
      <dt className="micro">{label}</dt>
      <dd>
        <span className={`stat__value num ${volt ? 'is-volt' : ''}`}>{value}</span>
        <span className="stat__meta">
          {live === true && <span className="tag tag--live"><span className="live-dot" aria-hidden="true" /> live</span>}
          {live === false && <span className="tag">not deployed yet</span>}
          {note && <span className="stat__note">{note}</span>}
        </span>
      </dd>
    </div>
  );
}

function PacMan({ rot = 0 }) {
  return (
    <svg className="pacman" viewBox="0 0 20 20" aria-hidden="true" style={{ rotate: `${rot}deg` }}>
      <path d="M10 10 L19 5.5 A10 10 0 1 0 19 14.5 Z" fill="var(--c-signal)" />
    </svg>
  );
}

export default function Landing() {
  const heroRef = useRef(null);
  const [pastHero, setPastHero] = useState(false);
  const go = useTransitionNavigate();
  const stats = useRegistryStats();
  const [count, volume] = stats.data?.map((r) => r.result) ?? [];

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { rootMargin: '-30% 0px 0px 0px' });
    io.observe(heroRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Header hideWordmark={!pastHero} />
      <main id="main">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="hero" ref={heroRef} aria-labelledby="hero-title">
          <FluidCanvas variant="hero" />
          <div className="hero__scrim" aria-hidden="true" />
          <CrosshairGrid />
          <div className="hero__content">
            <h1 id="hero-title" className="hero__title">
              <span className="hero__lead">Pay as you go,</span>
              <span className="hero__serif serif">
                <span>Own it—</span>
                <span className="hero__serif-2">forever.</span>
              </span>
            </h1>
            <p className="hero__ring">
              <Ring size={0.95} />
              <span>Machines that run a public rule you can check.</span>
            </p>
          </div>
          <Wordmark as="text" className="hero__wordmark" />
        </section>

        {/* ── Collage ────────────────────────────────────── */}
        <section className="collage" aria-labelledby="collage-title">
          <div className="collage__stage">
            <div className="collage__fluid"><FluidCanvas variant="collage" /></div>
            <h2 id="collage-title" className="collage__title">
              Machines that play fair today &amp; stay yours tomorrow.
            </h2>
          </div>
          <ul role="list" className="collage__cards">
            {COLLAGE.map((c) => (
              <li key={c.slot} className={`ccard ${c.cls} parallax`} style={{ '--speed': c.speed }}>
                <Picture slot={c.slot} subject={c.subject} mood={c.mood} alt={c.caption} sizes="(min-width: 64rem) 30vw, 55vw" />
                <p className="ccard__cap">{c.caption}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Use cases (sticky stacking) ───────────────── */}
        <section className="panels" aria-label="Use cases">
          {PANELS.map((p, i) => (
            <article key={p.slot} className="panel" style={{ zIndex: i + 1 }}>
              <Picture slot={p.slot} subject={p.subject} mood={p.mood} className="panel__bg" alt="" />
              <div className="panel__shade" aria-hidden="true" />
              <div className="panel__text">
                <p className="panel__label">{p.label}</p>
                <hr className="panel__rule" />
                <h2 className="panel__title">{p.title}</h2>
                <p className="panel__sub">{p.sub}</p>
              </div>
            </article>
          ))}
        </section>

        {/* ── Proof ─────────────────────────────────────── */}
        <section className="proof" aria-labelledby="proof-title">
          <div className="wrap">
            <h2 id="proof-title" className="proof__title"><Ring /> Proof, not promises</h2>
            <dl className="proof__grid">
              <Stat label="Inputs proven" value="64/64" volt note="exhaustive test, every input combination" />
              <Stat label="Relocks after payoff" value="0" note="in 64/64 cases + 5,000 fuzz runs" />
              <Stat label="Devices registered" value={registryLive ? (count != null ? String(count) : '…') : '—'} live={registryLive ? true : false} />
              <Stat label="USDT paid" value={registryLive ? (volume != null ? usdt(volume, 0) : '…') : '—'} live={registryLive ? true : false} />
            </dl>
            <p className="proof__foot">Numbers marked live are read from X Layer. The others link to tests in the repo — <TextLink href="https://github.com/eric-65/fairswitch/blob/main/docs/CLAIMS.md">see the evidence</TextLink>.</p>
          </div>
        </section>

        {/* ── Tech strip ────────────────────────────────── */}
        <section className="strip" aria-label="Built with">
          <div className="strip__track">
            {[0, 1].map((dup) => (
              <ul role="list" key={dup} className="strip__list" aria-hidden={dup === 1 || undefined}>
                {['X Layer', 'TapeOut', 'USDT0', 'ESP32'].map((w, i) => (
                  <li key={w}><span>{w}</span><PacMan rot={i * 90 + 30} /></li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────── */}
        <section className="how" aria-labelledby="how-title">
          <div className="wrap">
            <RevealText id="how-title" className="how__title" lines={['How it', <span className="serif" key="w">works</span>]} />
            <Statement className="how__stmt" text="Your machine downloads the exact rule from X Layer once, checks its fingerprint, then runs it by itself. No server can quietly change what happens when a payment is late." />
            <NumberedList items={STEPS} />
          </div>
        </section>

        {/* ── Benefits ──────────────────────────────────── */}
        <section className="benefits" aria-labelledby="benefits-title">
          <div className="wrap">
            <SectionLabel>benefits</SectionLabel>
            <h2 id="benefits-title" className="benefits__title"><Ring /> Why FairSwitch</h2>
            <Statement className="benefits__stmt" text="Rules you can read, not just trust." />
            <ul role="list" className="benefits__grid">
              <li><h3>For customers</h3><p>See exactly when the machine locks, for how long you can be late, and that it can never lock again once it’s yours.</p></li>
              <li><h3>For operators</h3><p>Get paid in USDT directly to your wallet. Fair, public terms make pay-as-you-go easier to sell.</p></li>
              <li><h3>For everyone checking</h3><p>The rule is a public circuit with a fixed hash. Anyone can fetch it, run it, and compare with the chain.</p></li>
            </ul>
          </div>
        </section>

        {/* ── Operators ─────────────────────────────────── */}
        <section className="ops" aria-labelledby="ops-title">
          <div className="wrap">
            <article className="ops__card">
              <div className="ops__copy">
                <h2 id="ops-title" className="ops__title"><Ring /> Operator Plan</h2>
                <p>Register a machine, set a price, a daily rate and grace days. Once registered, those terms are public and fixed.</p>
              </div>
              <Picture slot="operator-card" subject="card" mood="neutral" className="ops__pic" alt="A hand holding an Operator Plan card" />
            </article>
            <div className="ops__panel on-orange">
              <h2 className="ops__panel-title">Operator Dashboard</h2>
              <p className="ops__panel-sub">Register devices, set fair rules, get paid in USDT.</p>
              <div className="ops__panel-links">
                <TextLink to="/operator">open dashboard</TextLink>
                <TextLink to="/circuit">view circuit</TextLink>
              </div>
              <button className="ops__panel-btn" onClick={() => go('/operator')}>Open dashboard</button>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────── */}
        <section className="faq" aria-labelledby="faq-title">
          <div className="wrap">
            <SectionLabel>faq</SectionLabel>
            <h2 id="faq-title" className="faq__title"><Ring /> Popular Questions</h2>
            <div className="faq__list">
              {FAQ.map(([q, a]) => (
                <details key={q} className="faq__item">
                  <summary><span>{q}</span><span className="faq__icon" aria-hidden="true" /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing ───────────────────────────────────── */}
        <section className="closing" aria-labelledby="closing-title">
          <div className="wrap">
            <RevealText id="closing-title" className="closing__title" lines={['Fair machines, every day.', <span className="closing__accent" key="o">Ownership is next.</span>]} />
            <div className="closing__links">
              <TextLink to="/device/demo">try the virtual device</TextLink>
              <TextLink to="/circuit">view circuit</TextLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingCta to="/device/demo" navigate={go}>Open app</FloatingCta>
    </>
  );
}
