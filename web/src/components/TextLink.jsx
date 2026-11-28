import { Link } from 'react-router-dom';

/** Lowercase link with a short orange underline that grows on hover. */
export default function TextLink({ to, href, children, className = '', ...rest }) {
  const cls = `tlink ${className}`;
  if (href) return <a className={cls} href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>;
  return <Link className={cls} to={to} {...rest}>{children}</Link>;
}
