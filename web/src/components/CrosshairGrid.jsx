/** Thin white "+" markers on an invisible 3×3 grid. Decorative. */
export default function CrosshairGrid({ rows = 3 }) {
  const xs = ['var(--gutter)', '50%', 'calc(100% - var(--gutter))'];
  const ys = Array.from({ length: rows }, (_, i) => `${((i + 0.7) / rows) * 100}%`);
  return (
    <div className="crosshairs" aria-hidden="true">
      {ys.flatMap((y) =>
        xs.map((x) => <span key={`${x}-${y}`} className="crosshair" style={{ left: x, top: y }} />),
      )}
    </div>
  );
}
