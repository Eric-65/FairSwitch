import { ADDR, LINKS, oklink } from '../config.js';
import { short } from '../lib/format.js';
import { PINNED_HASH } from '../lib/circuit.js';
import { PixelArrowUp, PixelChevron } from './Pixel.jsx';
import Wordmark from './Wordmark.jsx';
import './Footer.css';

export default function Footer() {
  const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const contracts = [
    { k: 'Processor (TapeOut)', v: ADDR.processor, href: oklink(ADDR.processor) },
    { k: 'Circuit ID', v: ADDR.circuitId != null ? `#${ADDR.circuitId}` : 'pending tape-out', href: ADDR.circuitId != null ? oklink(ADDR.processor) : null },
    { k: 'Registry', v: ADDR.registry || 'not deployed yet', href: ADDR.registry ? oklink(ADDR.registry) : null },
    { k: 'USDT0', v: ADDR.usdt0, href: oklink(ADDR.usdt0) },
    { k: 'Netlist hash', v: PINNED_HASH, href: null },
  ];
  return (
    <footer className="footer">
      <div className="wrap">
        <ul role="list" className="footer__rows">
          {LINKS.map((l) => (
            <li key={l.label}>
              {l.placeholder ? (
                <span className="footer__row is-placeholder" aria-disabled="true">
                  <span>{l.label} <span className="tag">soon</span></span>
                  <PixelChevron />
                </span>
              ) : (
                <a className="footer__row" href={l.href} target="_blank" rel="noreferrer">
                  <span>{l.label}</span>
                  <PixelChevron />
                </a>
              )}
            </li>
          ))}
        </ul>

        <dl className="footer__contracts">
          {contracts.map((c) => (
            <div key={c.k}>
              <dt className="micro">{c.k}</dt>
              <dd className="mono">
                {c.href ? <a href={c.href} target="_blank" rel="noreferrer" title={c.v}>{c.v.startsWith('0x') && c.v.length > 42 ? short(c.v) : c.v.startsWith('0x') ? short(c.v) : c.v}</a>
                  : <span title={c.v}>{c.v.startsWith('0x') ? short(c.v) : c.v}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <div className="footer__base">
          <Wordmark as="text" className="footer__mark" />
          <button className="footer__top" onClick={toTop}>
            <PixelArrowUp title="Back to top" />
          </button>
        </div>
        <p className="footer__legal">Built for the X Layer TapeOut Accelerate hackathon. Rules are pinned and verifiable — TapeOut processors are upgradeable, so devices pin the netlist hash.</p>
      </div>
    </footer>
  );
}
