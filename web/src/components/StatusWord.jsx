import Ring from './Ring.jsx';
import './StatusWord.css';

export const STATE = {
  on: { word: 'On', accent: 'running', icon: '●' },
  grace: { word: 'Grace', accent: 'pay soon', icon: '◐' },
  locked: { word: 'Locked', accent: 'top up to resume', icon: '○' },
  owned: { word: 'Owned', accent: 'forever', icon: '◉' },
  refused: { word: 'Refused', accent: 'rule mismatch', icon: '!' },
  off: { word: 'Off', accent: 'not started', icon: '○' },
};

export function stateFrom({ owned, relayOn, graceWarning }) {
  if (owned) return 'owned';
  if (relayOn && graceWarning) return 'grace';
  if (relayOn) return 'on';
  return 'locked';
}

/** Big status word with a serif accent. Announced politely to screen readers on change. */
export default function StatusWord({ state, size = 'xl', tone = 'light' }) {
  const s = STATE[state] || STATE.off;
  return (
    <p className={`status status--${state} status--${size} status--${tone}`} aria-live="polite">
      <span className="sr-only">Device status: </span>
      {state === 'owned' && <Ring className="status__ring" size={0.55} />}
      <span className="status__word">{s.word}</span>{' '}
      <span className="status__accent serif-i">{s.accent}</span>
    </p>
  );
}
