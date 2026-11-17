'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBox } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

/** Stands in for Stripe's hosted onboarding pages. Rendered without the vendor sidebar. */
export default function SimulatedStripePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/vendor/payouts/stripe-complete', { method: 'POST', json: {} });
      router.replace('/vendor/payouts');
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
      setBusy(false);
    }
  };

  return (
    <main className="container" style={{ display: 'flex', justifyContent: 'center', padding: '64px 16px' }}>
      <section className="card stack" style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Stripe onboarding</h1>
        <p className="simulated">
          Prototype: this page stands in for Stripe&apos;s own onboarding pages. Honest &amp; Rare never sees your ID or bank
          details.
        </p>
        <ErrorBox error={error} />
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void finish()}>
            {busy ? 'Finishing…' : 'Finish on Stripe and return'}
          </button>
          <Link href="/vendor/payouts">Back without finishing</Link>
        </div>
      </section>
    </main>
  );
}
