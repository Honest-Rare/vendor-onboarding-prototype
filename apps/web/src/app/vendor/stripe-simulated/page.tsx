'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorBox, SimulatedNote } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

function SimulatedStripe() {
  const router = useRouter();
  const account = useSearchParams().get('account') ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/vendor/payouts/simulate-complete', { json: { accountId: account } });
      router.replace('/vendor');
    } catch (e) {
      setError(e as ApiError);
      setBusy(false);
    }
  };

  return (
    <div className="stack narrow">
      <h1>Payout setup</h1>
      <SimulatedNote>
        Simulated Stripe. With real test keys, this step happens on Stripe&apos;s own pages: identity check, owners and bank
        account (IBAN). Honest &amp; Rare never sees those details.
      </SimulatedNote>
      <ErrorBox error={error} />
      <div className="card stack">
        <p style={{ margin: 0 }}>On Stripe, the vendor would now:</p>
        <ol className="flow">
          <li>Confirm their business details</li>
          <li>Verify the legal representative (ID document)</li>
          <li>Add owners and directors (companies)</li>
          <li>Add the bank account for payouts</li>
        </ol>
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={busy || !account} onClick={() => void complete()}>
            Complete payout setup (simulated)
          </button>
          <button type="button" className="btn" onClick={() => router.replace('/vendor')}>
            Cancel
          </button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Account {account}
        </p>
      </div>
    </div>
  );
}

export default function SimulatedStripePage() {
  return (
    <Suspense>
      <SimulatedStripe />
    </Suspense>
  );
}
