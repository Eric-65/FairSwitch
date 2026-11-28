import Header from '../components/Header.jsx';
import TextLink from '../components/TextLink.jsx';
import Ring from '../components/Ring.jsx';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" style={{ minHeight: '100svh', background: 'var(--c-ink)', color: 'var(--c-white)', display: 'grid', alignContent: 'center', padding: 'var(--gutter)' }}>
        <h1 style={{ fontSize: 'var(--fs-mega)', fontWeight: 800, letterSpacing: '-0.055em' }}>
          Not <span className="serif" style={{ fontWeight: 400 }}>here—</span>
        </h1>
        <p style={{ display: 'flex', gap: '.5em', alignItems: 'center', fontSize: 'var(--fs-lead)', marginTop: 'var(--s-5)' }}>
          <Ring /> This page doesn’t exist.
        </p>
        <p style={{ marginTop: 'var(--s-6)', fontSize: 'var(--fs-label)' }}><TextLink to="/">back home</TextLink></p>
      </main>
    </>
  );
}
