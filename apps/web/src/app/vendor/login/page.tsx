'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

export default function VendorLoginPage() {
  return (
    <div className="stack">
      <h1>Vendor sign-in</h1>
      <p className="muted">
        Vendor accounts are created when we approve an application. Not a vendor yet? <Link href="/apply">Apply to sell</Link>.
      </p>
      <Suspense>
        <LoginForm role="vendor" home="/vendor" />
      </Suspense>
    </div>
  );
}
