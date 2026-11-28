/** Hollow orange ring bullet. Sized in em so it tracks the text it precedes. */
export default function Ring({ className = '', size = 1 }) {
  return (
    <svg className={`ring ${className}`} viewBox="0 0 100 100" aria-hidden="true" style={{ '--ring-size': `${size}em` }}>
      <circle cx="50" cy="50" r="37" fill="none" stroke="var(--c-signal)" strokeWidth="26" />
    </svg>
  );
}
