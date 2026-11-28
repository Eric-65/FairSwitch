import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVerify } from '../hooks/useChain.js';
import './VerifyRule.css';

/** "Verify the rule": fetch → hash → evaluate locally → compare with on-chain eval(). */
export default function VerifyRule({ bits, tone = 'light' }) {
  const verify = useVerify();
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null); // true | false | null
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setSteps([]); setResult(null);
    try { setResult(await verify(bits, setSteps)); }
    catch (e) { setSteps((s) => [...s, { k: 'err', ok: false, text: e.shortMessage || e.message }]); setResult(false); }
    finally { setBusy(false); }
  }

  return (
    <div className={`verify verify--${tone}`}>
      <button className="btn btn--ink" onClick={run} disabled={busy}>{busy ? 'Verifying…' : 'Verify the rule'}</button>
      <ol role="list" className="verify__steps" aria-live="polite">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <motion.li key={`${s.k}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={`verify__step ${s.ok === false ? 'is-bad' : ''}`}>
              <span className="verify__icon" aria-hidden="true">{s.ok === true ? '✓' : s.ok === false ? '✕' : '…'}</span>
              <span>{s.text} {s.demo && <span className="tag">demo</span>}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <AnimatePresence>
        {result !== null && (
          <motion.p className={`verify__result ${result ? 'is-ok' : 'is-bad'}`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <svg viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="23" fill="none" strokeWidth="4" />
              {result ? <motion.path d="M15 27 l7 7 l15 -16" fill="none" strokeWidth="5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
                : <path d="M17 17 L35 35 M35 17 L17 35" fill="none" strokeWidth="5" />}
            </svg>
            {result ? 'Match — your device runs the public rule.' : 'Mismatch — do not trust this device.'}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
