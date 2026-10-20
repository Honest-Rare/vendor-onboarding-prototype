import Link from 'next/link';
import type { ReactNode } from 'react';

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand">
            Honest <span>&amp;</span> Rare
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/">Sell with us</Link>
            <Link href="/apply">Apply</Link>
            <Link href="/vendor/login">Vendor login</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container spread">
          <span>Honest &amp; Rare: vendor onboarding pre-prototype</span>
          <Link href="/admin">Admin console</Link>
        </div>
      </footer>
    </>
  );
}
