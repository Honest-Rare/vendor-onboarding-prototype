'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorBox, Loading, SimulatedNote, StatusBadge } from '@/components/ui';
import { api, ApiError, formatDate, useLoad } from '@/lib/api';
import { SECTION_STATUS } from '@/lib/labels';
import type { Gate, Section } from '@/lib/sections';

type Overview = {
  vendor: { id: string; shopName: string; status: 'onboarding' | 'ready' | 'live'; liveAt: string | null };
  contactName: string;
  payoutsSimulated: boolean;
  gate: Gate;
  sections: Section[];
};

const STATUS_HELP: Record<string, string> = {
  not_started: '',
  submitted: 'Sent. Our team is checking it.',
  approved: 'Approved by our team',
  changes_requested: 'Please update this section',
};

function Checklist() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, error, reload } = useLoad<Overview>('/vendor/overview', '/vendor/login');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const refreshed = useRef(false);

  // Coming back from Stripe: read the payout status once.
  useEffect(() => {
    if (params.get('payouts') && !refreshed.current) {
      refreshed.current = true;
      void api('/vendor/payouts/refresh', { method: 'POST' }).then(reload).finally(() => router.replace('/vendor'));
    }
  }, [params, reload, router]);

  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const startPayouts = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const { url } = await api<{ url: string }>('/vendor/payouts/start', { method: 'POST' });
      window.location.href = url;
    } catch (e) {
      setActionError(e as ApiError);
      setBusy(false);
    }
  };

  const goLive = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api('/vendor/go-live', { method: 'POST' });
      await reload();
    } catch (e) {
      setActionError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const { gate, vendor } = data;
  const attention = data.sections.filter((s) => s.status === 'changes_requested');

  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 4 }}>{vendor.shopName}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {vendor.status === 'live'
            ? `Your shop is live since ${formatDate(vendor.liveAt)}.`
            : `Hello ${data.contactName}. Complete each section below, in any order. Our team checks each one before your shop goes live.`}
        </p>
      </div>

      <ErrorBox error={actionError} />

      {attention.length > 0 && (
        <div className="alert alert-warn" role="status">
          <strong>Our team asked for changes:</strong>
          <ul>
            {attention.map((s) => (
              <li key={s.key}>
                <Link href={`/vendor/sections/${s.key}`}>{s.title}</Link>: {s.adminNote}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="card stack" style={{ gap: 10 }} aria-labelledby="gate-title">
        <div className="spread">
          <h2 id="gate-title" style={{ margin: 0 }}>
            {vendor.status === 'live' ? 'Your shop is live' : vendor.status === 'ready' ? 'Ready to go live' : 'Your progress'}
          </h2>
          <span className="muted small">
            {gate.approved} of {gate.total} approved
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={gate.total} aria-valuenow={gate.approved}>
          <div style={{ width: `${(gate.approved / Math.max(1, gate.total)) * 100}%` }} />
        </div>
        {vendor.status === 'ready' && (
          <div className="row">
            <p style={{ margin: 0 }}>Every section needed to go live is approved. Put your shop live whenever you are ready.</p>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void goLive()}>
              Go live
            </button>
          </div>
        )}
        {vendor.status === 'onboarding' && gate.waitingForReview.length > 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            Waiting for our check: {gate.waitingForReview.join(', ')}
          </p>
        )}
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.sections.map((s) => (
              <tr key={s.key}>
                <td>
                  <strong>{s.title}</strong>
                  <div className="muted small">{s.description}</div>
                  {s.requiredBefore === 'first_payout' && <div className="small">Not needed to go live; needed before your first payout.</div>}
                </td>
                <td>
                  <StatusBadge map={SECTION_STATUS} value={s.status} />
                  <div className="muted small" style={{ marginTop: 4 }}>
                    {s.reviewer === 'stripe' && s.status === 'submitted' ? 'Waiting for Stripe' : STATUS_HELP[s.status]}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {s.reviewer === 'stripe' ? (
                    s.status !== 'approved' && (
                      <button type="button" className="btn btn-small btn-primary" disabled={busy} onClick={() => void startPayouts()}>
                        {s.status === 'not_started' ? 'Set up payouts' : 'Continue on Stripe'}
                      </button>
                    )
                  ) : (
                    <Link href={`/vendor/sections/${s.key}`} className={`btn btn-small ${s.status === 'not_started' || s.status === 'changes_requested' ? 'btn-primary' : ''}`}>
                      {s.status === 'not_started' ? 'Start' : s.status === 'changes_requested' ? 'Update' : 'View'}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.payoutsSimulated && (
        <SimulatedNote>Prototype: payouts use a simulated Stripe until test keys are added. No real data is entered.</SimulatedNote>
      )}
    </div>
  );
}

export default function VendorHomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Checklist />
    </Suspense>
  );
}
