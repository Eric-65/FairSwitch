import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';

/** navigate() wrapped in the View Transitions API when available. */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  return (to, opts) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) return navigate(to, opts);
    document.startViewTransition(() => flushSync(() => navigate(to, opts)));
  };
}
