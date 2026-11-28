import { useMemo } from 'react';
import { artifact } from '../lib/circuit.js';
import './CircuitDiagram.css';

const N_IN = artifact.nIn;
const FIRST_GATE = 2 + N_IN;
const OUT_SIGNALS = artifact.outputs.map((_, i) => FIRST_GATE + artifact.gates.length - artifact.nOut + i);

/** Layout: inputs in column 0, each gate at column = logic depth, outputs at the end. */
function useLayout() {
  return useMemo(() => {
    const depth = { 0: 0, 1: 0 };
    for (let i = 0; i < N_IN; i++) depth[2 + i] = 0;
    for (const g of artifact.gates) depth[g.signal] = Math.max(depth[g.a], depth[g.b]) + 1;
    const maxD = Math.max(...artifact.gates.map((g) => depth[g.signal]));
    const cols = {};
    for (const g of artifact.gates) (cols[depth[g.signal]] ||= []).push(g.signal);
    const COL = 120, ROW = 64, PAD = 40;
    const rowsMax = Math.max(N_IN, ...Object.values(cols).map((c) => c.length));
    const H = PAD * 2 + (rowsMax - 1) * ROW;
    const pos = {};
    const place = (sigs, col) => {
      const off = (H - (sigs.length - 1) * ROW) / 2;
      sigs.forEach((s, i) => { pos[s] = { x: PAD + 70 + col * COL, y: off + i * ROW }; });
    };
    place(Array.from({ length: N_IN }, (_, i) => 2 + i), 0);
    for (let d = 1; d <= maxD; d++) place(cols[d] || [], d);
    const outX = PAD + 70 + (maxD + 1) * COL + 40;
    const W = outX + 150;
    return { pos, W, H, outX };
  }, []);
}

const wire = (a, b) => {
  const mx = (a.x + b.x) / 2;
  return `M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
};

export default function CircuitDiagram({ signals, onToggle }) {
  const { pos, W, H, outX } = useLayout();
  const v = (s) => signals?.[s] ?? 0;
  const relayOn = v(OUT_SIGNALS[1]) === 1;

  return (
    <div className="circuit">
      <div className="circuit__scroll" tabIndex={0} aria-label="Circuit diagram (scrolls sideways)">
      <svg viewBox={`0 0 ${W} ${H}`} className="circuit__svg" role="img"
        aria-label={`Lockout circuit, ${artifact.gates.length} NAND gates. Relay is ${relayOn ? 'on' : 'off'}.`}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* wires */}
        <g className="circuit__wires">
          {artifact.gates.flatMap((g) => [g.a, g.b].map((src, k) => {
            const from = { x: pos[src].x + 14, y: pos[src].y };
            const to = { x: pos[g.signal].x - 18, y: pos[g.signal].y + (k ? 7 : -7) };
            return <path key={`${g.signal}-${k}`} d={wire(from, to)} className={`w ${v(src) ? 'is-hi' : ''}`} />;
          }))}
          {OUT_SIGNALS.map((s, i) => (
            <path key={`o${s}`} d={wire({ x: pos[s].x + 18, y: pos[s].y }, { x: outX, y: 60 + i * ((H - 120) / 2) })}
              className={`w ${v(s) ? (i === 1 ? 'is-relay' : 'is-hi') : ''}`} />
          ))}
        </g>

        {/* gates */}
        {artifact.gates.map((g) => (
          <g key={g.signal} transform={`translate(${pos[g.signal].x} ${pos[g.signal].y})`} className={`gate ${v(g.signal) ? 'is-hi' : ''}`}>
            <path d="M-18 -16 H0 A16 16 0 0 1 0 16 H-18 Z" />
            <circle cx="20" cy="0" r="3.5" />
            <title>{`${g.name} = NAND(s${g.a}, s${g.b}) → s${g.signal} = ${v(g.signal)}`}</title>
            <text x="-6" y="30" textAnchor="middle">{g.signal}</text>
          </g>
        ))}

        {/* inputs */}
        {artifact.inputs.map((name, i) => {
          const s = 2 + i; const p = pos[s]; const on = v(s) === 1;
          return (
            <g key={name} transform={`translate(${p.x} ${p.y})`} className={`pin ${on ? 'is-hi' : ''}`}>
              <text x="-20" y="4" textAnchor="end" className="pin__label">{name}</text>
              <circle r="9" />
            </g>
          );
        })}

        {/* outputs */}
        {artifact.outputs.map((name, i) => {
          const y = 60 + i * ((H - 120) / 2); const on = v(OUT_SIGNALS[i]) === 1;
          return (
            <g key={name} transform={`translate(${outX} ${y})`} className={`pin pin--out ${on ? (i === 1 ? 'is-relay' : 'is-hi') : ''}`}>
              <circle r="11" />
              <text x="20" y="5" className="pin__label">{name}</text>
            </g>
          );
        })}
      </svg>
      </div>

      {onToggle && (
        <fieldset className="circuit__toggles">
          <legend className="micro">Inputs — tap to toggle</legend>
          {artifact.inputs.map((name, i) => (
            <label key={name} className={`toggle ${v(2 + i) ? 'is-on' : ''}`}>
              <input type="checkbox" checked={v(2 + i) === 1} onChange={() => onToggle(i)} />
              <span className="toggle__dot" aria-hidden="true" />
              <span className="toggle__name">i{i} {name}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
