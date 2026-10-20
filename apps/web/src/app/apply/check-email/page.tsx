'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StorefrontShell } from '@/components/StorefrontShell';
import { SimulatedNote } from '@/components/ui';

function CheckEmail() {
  const email = useSearchParams().get('email');
  return (
    <div className="card stack">
      <h1>Check your email</h1>
      <p>
        We sent a confirmation link to <strong>{email ?? 'your email address'}</strong>. Click it to send your application to
        our team. The link works once and expires in 3 days.
      </p>
      <p className="muted">No email? Check your spam folder.</p>
      <SimulatedNote>
        Prototype: emails go to the local test inbox at <a href="http://localhost:8026">localhost:8026</a>.
      </SimulatedNote>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <StorefrontShell>
      <main className="container narrow">
        <Suspense>
          <CheckEmail />
        </Suspense>
      </main>
    </StorefrontShell>
  );
}
