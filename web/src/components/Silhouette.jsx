// Simple line silhouettes for image placeholders. 100×100 viewBox, stroke = currentColor.
const P = {
  solar: (
    <>
      <path d="M18 30 L72 22 L82 52 L28 60 Z" />
      <path d="M36 27.5 L45 56.5 M54 25 L63 54 M22 42 L77 35" />
      <path d="M55 58 V76 M44 76 H68" />
      <rect x="20" y="66" width="18" height="14" rx="2" />
      <path d="M29 66 V62 M38 72 C46 72 48 66 55 66" />
    </>
  ),
  freezer: (
    <>
      <rect x="14" y="40" width="72" height="40" rx="4" />
      <path d="M14 40 L20 22 H80 L86 40" />
      <path d="M24 52 H40" />
      <path d="M32 18 C30 12 36 10 34 4 M50 18 C48 12 54 10 52 4 M68 18 C66 12 72 10 70 4" opacity=".6" />
    </>
  ),
  battery: (
    <>
      <rect x="34" y="16" width="32" height="70" rx="6" />
      <rect x="42" y="10" width="16" height="6" rx="1.5" />
      <path d="M52 34 L44 52 H56 L48 70" />
    </>
  ),
  laundry: (
    <>
      <rect x="20" y="12" width="60" height="76" rx="6" />
      <path d="M20 28 H80 M30 20 H44" />
      <circle cx="68" cy="20" r="3" />
      <circle cx="50" cy="58" r="20" />
      <path d="M36 60 C44 52 56 66 64 58" />
    </>
  ),
  bulb: (
    <>
      <path d="M38 64 C38 54 28 48 28 36 A22 22 0 0 1 72 36 C72 48 62 54 62 64 Z" />
      <path d="M40 70 H60 M42 76 H58 M46 82 H54" />
      <path d="M44 56 L46 40 L50 46 L54 40 L56 56" />
    </>
  ),
  esp32: (
    <>
      <rect x="10" y="30" width="44" height="40" rx="2" />
      <rect x="22" y="40" width="20" height="20" />
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${14 + i * 7} 30 V26 M${14 + i * 7} 70 V74`} />)}
      <rect x="62" y="36" width="28" height="28" rx="2" />
      <circle cx="76" cy="50" r="7" />
      <path d="M54 44 C58 44 58 46 62 46 M54 56 C58 56 58 54 62 54" />
    </>
  ),
  phone: (
    <>
      <rect x="30" y="8" width="40" height="84" rx="7" />
      <path d="M44 14 H56" />
      <circle cx="50" cy="40" r="11" />
      <rect x="38" y="70" width="24" height="8" rx="4" />
    </>
  ),
  card: (
    <>
      <rect x="22" y="26" width="60" height="40" rx="5" transform="rotate(-6 52 46)" />
      <circle cx="34" cy="40" r="5" />
      <path d="M44 38 H62 M44 44 H56" />
      <path d="M10 92 C14 76 24 70 34 70 L44 64" />
    </>
  ),
  relay: (
    <>
      <rect x="22" y="30" width="56" height="40" rx="4" />
      <path d="M34 50 H44 L56 42 M58 50 H66" />
      <circle cx="44" cy="50" r="2" /><circle cx="58" cy="50" r="2" />
    </>
  ),
};

export default function Silhouette({ subject, className = '' }) {
  return (
    <svg className={`silhouette ${className}`} viewBox="0 0 100 100" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {P[subject] || P.bulb}
    </svg>
  );
}
