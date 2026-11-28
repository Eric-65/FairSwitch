// Pixel-art glyphs on an 8×8 grid, rendered crisp.
const CHEVRON = ['..##....', '...##...', '....##..', '.....##.', '.....##.', '....##..', '...##...', '..##....'];
const ARROW_UP = ['...##...', '..####..', '.######.', '##.##.##', '...##...', '...##...', '...##...', '...##...'];

function Grid({ rows, className, title }) {
  const cells = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => c === '#' && cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)));
  return (
    <svg className={className} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <g fill="currentColor">{cells}</g>
    </svg>
  );
}

export const PixelChevron = (p) => <Grid rows={CHEVRON} className={`pixel pixel-chevron ${p.className || ''}`} />;
export const PixelArrowUp = (p) => <Grid rows={ARROW_UP} className={`pixel ${p.className || ''}`} title={p.title} />;
