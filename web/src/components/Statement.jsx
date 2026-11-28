import { useEffect, useRef } from 'react';
import { supportsScrollTimeline } from '../hooks/useInView.js';

/** Big grey paragraph whose words turn ink as it scrolls through the viewport. */
export default function Statement({ text, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (supportsScrollTimeline() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    const words = [...el.querySelectorAll('.stmt-word')];
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => { w.style.color = i < lit ? 'var(--c-ink)' : 'var(--c-slate-1)'; });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <p ref={ref} className={`statement ${className}`}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="stmt-word">{w} </span>
      ))}
    </p>
  );
}
