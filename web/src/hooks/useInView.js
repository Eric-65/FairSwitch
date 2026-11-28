import { useEffect, useRef, useState } from 'react';

/** Fallback for browsers without scroll-driven animations: true once the element is in view. */
export function useInView(options = { rootMargin: '0px 0px -15% 0px' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, options);
    io.observe(el);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, inView];
}

export const supportsScrollTimeline = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()');
