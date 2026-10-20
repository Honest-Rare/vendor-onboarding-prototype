'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StorefrontShell } from '@/components/StorefrontShell';
import { ErrorBox, Loading } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

function Confirm() {
  const token = useSearchParams().get('token') ?? '';
  const [shopName, setShopName] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // the link works once, so never send it twice
    sent.current = true;
    api<{ shopName: string }>('/applications/confirm', { json: { token } })
      .then((r) => setShopName(r.shopName))
      .catch((e) => setError(e));
  }, [token]);

  if (error) {
    return (
      <div className="card stack">
        <h1>We could not confirm your email</h1>
        <ErrorBox error={error} />
        <p className="muted">If you already clicked the link, your application is with us and nothing else is needed.</p>
      </div>
    );
  }
  if (!shopName) return <Loading />;
  return (
    <div className="card stack">
      <h1>Thank you, your application is with us</h1>
      <p>
        Your email is confirmed and the application for <strong>{shopName}</strong> is now in our review queue.
      </p>
      <h2>What happens next</h2>
      <ol className="flow">
        <li>We run a few automatic checks (for example your VAT ID).</li>
        <li>A member of our team reviews your application.</li>
        <li>We may email you a question.</li>
        <li>If you are approved, you receive a link to set up your vendor account.</li>
      </ol>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <StorefrontShell>
      <main className="container narrow">
        <Suspense fallback={<Loading />}>
          <Confirm />
        </Suspense>
      </main>
    </StorefrontShell>
  );
}
