import { pad2 } from '../lib/format.js';
import './NumberedList.css';

/** {01} Title — description + optional vertical items. */
export default function NumberedList({ items, tone = 'light' }) {
  return (
    <ol role="list" className={`numlist numlist--${tone}`}>
      {items.map((it, i) => (
        <li key={it.title} className="numlist__item">
          <p className="numlist__no micro" aria-hidden="true">{'{'}{pad2(i + 1)}{'}'}</p>
          <h3 className="numlist__title">{it.title} <span aria-hidden="true">—</span></h3>
          {it.desc && <p className="numlist__desc">{it.desc}</p>}
          {it.items && (
            <ul role="list" className="numlist__sub">
              {it.items.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
