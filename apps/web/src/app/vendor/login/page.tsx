'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

/** Rendered without the vendor sidebar, so it brings its own header. */
export default function VendorLoginPage() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="row" style={{ gap: 0 }}>
            <Link href="/" className="brand">
              Honest <span>&amp;</span> Rare
            </Link>
            <span className="area-tag">Vendor panel</span>
          </div>
        </div>
      </header>
      <main className="container stack">
        <h1 style={{ margin: 0 }}>Vendor sign-in</h1>
        <p className="muted" style={{ margin: 0 }}>
          Vendor accounts are created when we approve an application. Not a vendor yet? <Link href="/apply">Apply to sell</Link>.
        </p>
        <p className="simulated" style={{ maxWidth: 420 }}>
          Prototype: any email and password sign you in.
        </p>
        <Suspense>
          <LoginForm role="vendor" home="/vendor" />
        </Suspense>
      </main>
    </>
  );
}
