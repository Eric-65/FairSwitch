import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import Wordmark from './Wordmark.jsx';
import { PixelChevron } from './Pixel.jsx';
import WalletButton from './WalletButton.jsx';
import './Header.css';

const ROWS = [
  { to: '/', label: 'Home' },
  { to: '/device/demo', label: 'Virtual device' },
  { to: '/d/demo', label: 'Device status' },
  { to: '/operator', label: 'Operator' },
  { to: '/circuit', label: 'Circuit' },
];

export default function Header({ hideWordmark = false }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduce = useReducedMotion();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="site-header">
        <div className={`site-header__mark ${hideWordmark && !open ? 'is-hidden' : ''}`}>
          <Wordmark />
        </div>
        <button
          className={`menu-btn ${open ? 'is-open' : ''}`}
          aria-expanded={open}
          aria-controls={id}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id={id}
            className="menu"
            aria-label="Main"
            initial={reduce ? { opacity: 0 } : { clipPath: 'circle(0% at calc(100% - 3.5rem) 2.5rem)' }}
            animate={reduce ? { opacity: 1 } : { clipPath: 'circle(150% at calc(100% - 3.5rem) 2.5rem)' }}
            exit={reduce ? { opacity: 0 } : { clipPath: 'circle(0% at calc(100% - 3.5rem) 2.5rem)' }}
            transition={{ duration: reduce ? 0.15 : 0.55, ease: [0.65, 0, 0.35, 1] }}
          >
            <ul role="list" className="menu__rows">
              {ROWS.map((r, i) => (
                <motion.li
                  key={r.to}
                  initial={reduce ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.18 + i * 0.04, duration: 0.4 }}
                >
                  <NavLink to={r.to} className="menu__row" end>
                    <span>{r.label}</span>
                    <PixelChevron />
                  </NavLink>
                </motion.li>
              ))}
            </ul>
            <div className="menu__foot">
              <WalletButton tone="dark" />
              <p className="menu__note">USDT on X Layer · rules on TapeOut</p>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
