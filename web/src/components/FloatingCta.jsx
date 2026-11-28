import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import './FloatingCta.css';

/** Fixed bottom-right CTA with a slight magnetic hover. Renders a link (to/href) or a button. */
export default function FloatingCta({ children, onClick, href, to, navigate, disabled, ariaLabel }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });

  const move = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    x.set(Math.max(-10, Math.min(10, (e.clientX - (r.left + r.width / 2)) * 0.25)));
    y.set(Math.max(-10, Math.min(10, (e.clientY - (r.top + r.height / 2)) * 0.25)));
  };
  const reset = () => { x.set(0); y.set(0); };
  const handle = (e) => {
    if (to && navigate) { e.preventDefault(); navigate(to); }
    onClick?.(e);
  };

  const Tag = href || to ? motion.a : motion.button;
  return (
    <Tag
      ref={ref}
      className="floating-cta"
      style={{ x, y }}
      href={href || to}
      onClick={handle}
      onPointerMove={move}
      onPointerLeave={reset}
      disabled={Tag === motion.button ? disabled : undefined}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
    >
      <span>{children}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
    </Tag>
  );
}
