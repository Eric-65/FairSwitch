import { Link } from 'react-router-dom';

export default function Wordmark({ as = 'link', className = '' }) {
  if (as === 'text') return <span className={`wordmark ${className}`}>FairSwitch</span>;
  return (
    <Link to="/" className={`wordmark ${className}`} aria-label="FairSwitch home">
      FairSwitch
    </Link>
  );
}
