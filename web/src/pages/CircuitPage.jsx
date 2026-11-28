import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import CircuitDiagram from '../components/CircuitDiagram.jsx';
import StatusWord, { stateFrom } from '../components/StatusWord.jsx';
import Ring from '../components/Ring.jsx';
import TextLink from '../components/TextLink.jsx';
import Footer from '../components/Footer.jsx';
import { ADDR, oklink } from '../config.js';
import { artifact, evaluateWithSignals, loadCircuit, PINNED_HASH } from '../lib/circuit.js';
import { short } from '../lib/format.js';
import './CircuitPage.css';

export default function CircuitPage() {
  const circuit = useMemo(() => loadCircuit(artifact.netlist), []);
  const [bits, setBits] = useState([0, 0, 1, 1, 1, 0]); // active, renting
  const { signals, outputs } = evaluateWithSignals(circuit, bits);
  const toggle = (i) => setBits((b) => b.map((v, k) => (k === i ? 1 - v : v)));
  const [owned, relayOn, graceWarning] = outputs.map(Boolean);

  return (
    <>
      <Header />
      <main id="main" className="cx">
        <div className="wrap">
          <p className="cx__kicker">circuit explorer</p>
          <h1 className="cx__title">The rule, <span className="serif">in gates.</span></h1>
          <p className="cx__lede">{artifact.gateCount} NAND gates, {artifact.nIn} inputs, {artifact.nOut} outputs. Toggle the inputs — wires glow aqua when they carry a 1; the relay turns orange.</p>

          <dl className="cx__facts">
            <div><dt className="micro">Processor</dt><dd className="mono"><a href={oklink(ADDR.processor)} target="_blank" rel="noreferrer">{short(ADDR.processor)}</a></dd></div>
            <div><dt className="micro">Circuit ID</dt><dd className="mono">{ADDR.circuitId != null ? `#${ADDR.circuitId}` : 'pending tape-out'}</dd></div>
            <div><dt className="micro">Netlist hash</dt><dd className="mono" title={PINNED_HASH}>{short(PINNED_HASH)}</dd></div>
            <div><dt className="micro">Proof</dt><dd>64/64 inputs · never relocks</dd></div>
          </dl>

          <div className="cx__state">
            <StatusWord state={stateFrom({ owned, relayOn, graceWarning })} size="md" tone="dark" />
          </div>

          <CircuitDiagram signals={signals} onToggle={toggle} />

          <section className="cx__formulas" aria-labelledby="f-title">
            <h2 id="f-title" className="cx__h2"><Ring /> What the gates compute</h2>
            <ul role="list">
              <li><b>OWNED</b> = OWNED_PREV ∨ (PAID_OFF ∧ STATE_VALID)</li>
              <li><b className="is-relay">RELAY_ON</b> = OWNED ∨ (STATE_VALID ∧ ¬TAMPER ∧ (CREDIT_ACTIVE ∨ IN_GRACE))</li>
              <li><b>GRACE_WARNING</b> = ¬OWNED ∧ STATE_VALID ∧ ¬CREDIT_ACTIVE ∧ IN_GRACE</li>
            </ul>
            <p className="cx__note">Try it: set OWNED_PREV, then switch anything else — the relay stays on. That’s the never-relock guarantee, tested over all 64 input combinations and on the real TapeOut evaluator.</p>
            <div className="cx__links">
              <TextLink href="https://github.com/eric-65/fairswitch/blob/main/docs/VERIFICATION.md">verification log</TextLink>
              <TextLink to="/device/demo">run it on a device</TextLink>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
