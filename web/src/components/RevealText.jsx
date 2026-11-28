import { useInView } from '../hooks/useInView.js';

/** Renders `lines` (array of strings or nodes) as line-by-line scroll reveals. */
export default function RevealText({ as: Tag = 'h2', lines, className = '', ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag ref={ref} className={`${className} ${inView ? 'is-in' : ''}`} {...rest}>
      {lines.map((l, i) => (
        <span className="reveal-line" key={i}>
          <span style={{ transitionDelay: `${i * 60}ms` }}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}
