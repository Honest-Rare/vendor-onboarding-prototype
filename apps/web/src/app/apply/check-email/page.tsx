'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StorefrontShell } from '@/components/StorefrontShell';
import { SimulatedNote } from '@/components/ui';

function CheckEmail() {
  const params = useSearchParams();
  const email = params.get('email');
  const token = params.get('token');
  return (
    <div className="card stack">
      <h1>Check your email</h1>
      <p>
        We sent a confirmation link to <strong>{email ?? 'your email address'}</strong>. Click it to send your application to
        our team. The link works once and expires in 3 days.
      </p>
      <p className="muted">No email? Check your spam folder.</p>
      <SimulatedNote>
        Prototype: no email is sent.{' '}
        {token ? (
          <Link href={`/apply/confirm?token=${encodeURIComponent(token)}`}>Open the confirmation link</Link>
        ) : (
          'Send an application to get a confirmation link'
        )}
        .
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
