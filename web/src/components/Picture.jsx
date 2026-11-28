import { IMAGES } from '../lib/images.js';
import Silhouette from './Silhouette.jsx';
import './Picture.css';

/**
 * Image slot from docs/IMAGES.md. If the generated file exists (listed in lib/images.js),
 * renders <picture> with AVIF/WebP srcsets; otherwise a styled gradient + silhouette placeholder.
 */
export default function Picture({ slot, alt, subject, mood = 'aqua', className = '', eager = false, sizes = '100vw' }) {
  const img = IMAGES[slot];
  if (!img) {
    return (
      <div className={`pic pic--placeholder pic--${mood} ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        {subject && <Silhouette subject={subject} />}
      </div>
    );
  }
  const set = (ext) => img.widths.map((w) => `/img/${slot}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture className={`pic ${className}`}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`/img/${slot}-${img.widths[1] || img.widths[0]}.jpg`} alt={alt || ''} width={img.w} height={img.h}
        loading={eager ? 'eager' : 'lazy'} decoding="async" fetchpriority={eager ? 'high' : undefined} />
    </picture>
  );
}
