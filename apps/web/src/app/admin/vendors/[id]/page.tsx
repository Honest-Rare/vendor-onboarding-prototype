'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorBox, Field, Loading, StatusBadge } from '@/components/ui';
import { api, ApiError, formatDate, useLoad } from '@/lib/api';
import { CATEGORY_LABELS, SECTION_STATUS, VENDOR_STATUS } from '@/lib/labels';
import { displayValue, type Gate, type Section } from '@/lib/sections';

type Detail = {
  vendor: {
    id: string;
    shopName: string;
    status: string;
    createdAt: string;
    liveAt: string | null;
    stripeAccountId: string | null;
    legalName: string;
    vatId: string | null;
    taxNumber: string | null;
    address: { street: string | null; postcode: string | null; city: string | null; country: string };
    slug: string;
    preModeration: boolean;
  };
  application: { id: string; legalName: string; email: string; country: string; categories: string[] };
  gate: Gate;
  sections: Section[];
  events: Array<{ subject_type: string; from_status: string | null; to_status: string | null; actor: string; reason: string | null; meta: any; created_at: string }>;
};

function SectionReview({ vendorId, section, onDone }: { vendorId: string; section: Section; onDone: () => Promise<unknown> }) {
  const [mode, setMode] = useState<'idle' | 'changes'>('idle');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const review = async (decision: 'approve' | 'request_changes') => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/vendors/${vendorId}/sections/${section.key}/review`, { json: { decision, note } });
      setMode('idle');
      setNote('');
      await onDone();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" aria-labelledby={`s-${section.key}`}>
      <div className="spread">
        <h2 id={`s-${section.key}`} style={{ margin: 0 }}>
          {section.title}
        </h2>
        <StatusBadge map={SECTION_STATUS} value={section.status} />
      </div>
      {section.requiredBefore === 'first_payout' && (
        <p className="muted small" style={{ margin: 0 }}>
          Not part of the go-live gate. Needed before the first payout.
        </p>
      )}
      {section.reviewer === 'stripe' ? (
        <p className="muted" style={{ margin: 0 }}>
          Checked by Stripe: identity and bank account are verified on Stripe&apos;s side. Approved when payouts are enabled.
        </p>
      ) : section.status === 'not_started' ? (
        <p className="muted" style={{ margin: 0 }}>
          The vendor has not sent this section yet.
        </p>
      ) : (
        <dl className="facts">
          {section.fields.map((f) => (
            <div key={f.key} style={{ display: 'contents' }}>
              <dt>{f.label}</dt>
              <dd style={{ whiteSpace: 'pre-line' }}>
                {f.type === 'document' && section.data[f.key] ? (
                  <a href={`/api/files/${section.data[f.key]}`} target="_blank" rel="noreferrer">
                    {displayValue(f, section.data[f.key], section.files)}
                  </a>
                ) : (
                  displayValue(f, section.data[f.key], section.files)
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {section.adminNote && section.status === 'changes_requested' && (
        <div className="alert alert-warn small">You asked: “{section.adminNote}”</div>
      )}
      {section.reviewer === 'admin' && section.status === 'submitted' && (
        <div className="stack" style={{ gap: 8 }}>
          <ErrorBox error={error} />
          {mode === 'changes' ? (
            <>
              <Field label="What should the vendor change?" htmlFor={`note-${section.key}`} required>
                <textarea id={`note-${section.key}`} style={{ minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <div className="row">
                <button type="button" className="btn btn-primary" disabled={busy || note.trim().length < 3} onClick={() => void review('request_changes')}>
                  Send to vendor
                </button>
                <button type="button" className="btn" onClick={() => setMode('idle')}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="row">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void review('approve')}>
                Approve section
              </button>
              <button type="button" className="btn" onClick={() => setMode('changes')}>
                Request changes
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BusinessDetails({
  vendor,
  appliedLegalName,
  onDone,
}: {
  vendor: Detail['vendor'];
  appliedLegalName: string;
  onDone: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const a = vendor.address;
  const streetAndCity = [a.street, [a.postcode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  const togglePreModeration = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/vendors/${vendor.id}/pre-moderation`, { json: { enabled: !vendor.preModeration } });
      await onDone();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" style={{ gap: 8 }} aria-labelledby="biz-title">
      <h2 id="biz-title" style={{ margin: 0 }}>
        Business
      </h2>
      <dl className="facts">
        <dt>Legal name</dt>
        <dd>
          {vendor.legalName}
          {vendor.legalName !== appliedLegalName && <div className="muted small">Applied as {appliedLegalName}</div>}
        </dd>
        <dt>Address</dt>
        <dd>{streetAndCity ? `${streetAndCity}, ${a.country}` : <span className="muted">Missing ({a.country})</span>}</dd>
        <dt>VAT ID</dt>
        <dd>{vendor.vatId || '—'}</dd>
        {vendor.taxNumber && (
          <>
            <dt>Tax number</dt>
            <dd>{vendor.taxNumber}</dd>
          </>
        )}
        <dt>Vendor page address</dt>
        <dd>{vendor.slug}</dd>
        <dt>Product checks</dt>
        <dd>{vendor.preModeration ? 'Our team checks new and edited products' : 'Products go live without our check'}</dd>
      </dl>
      <ErrorBox error={error} />
      <div className="row">
        <button type="button" className="btn btn-small" disabled={busy} onClick={() => void togglePreModeration()}>
          {vendor.preModeration ? 'Switch product checks off' : 'Switch product checks on'}
        </button>
      </div>
    </section>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useLoad<Detail>(`/admin/vendors/${id}`, '/admin/login');
  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const titles = Object.fromEntries(data.sections.map((s) => [s.key, s.title]));

  return (
    <div className="stack">
      <div>
        <Link href="/admin/vendors" className="small">
          ← All vendors
        </Link>
      </div>
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{data.vendor.shopName}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {data.application.legalName} · {data.application.country} ·{' '}
            {data.application.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')} ·{' '}
            <Link href={`/admin/applications/${data.application.id}`}>Application</Link>
          </p>
        </div>
        <StatusBadge map={VENDOR_STATUS} value={data.vendor.status} />
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <div className="spread">
          <strong>
            Go-live gate: {data.gate.approved} of {data.gate.total} sections approved
          </strong>
          {data.vendor.liveAt && <span className="muted small">Live since {formatDate(data.vendor.liveAt)}</span>}
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={data.gate.total} aria-valuenow={data.gate.approved}>
          <div style={{ width: `${(data.gate.approved / Math.max(1, data.gate.total)) * 100}%` }} />
        </div>
        {data.gate.waitingForReview.length > 0 && <p className="small" style={{ margin: 0 }}>Waiting for you: {data.gate.waitingForReview.join(', ')}</p>}
        {data.gate.needsVendorAction.length > 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            Waiting for the vendor: {data.gate.needsVendorAction.join(', ')}
          </p>
        )}
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {data.sections.map((s) => (
            <SectionReview key={s.key} vendorId={data.vendor.id} section={s} onDone={reload} />
          ))}
        </div>
        <aside className="detail-side">
          <BusinessDetails vendor={data.vendor} appliedLegalName={data.application.legalName} onDone={reload} />
          <section className="card" aria-labelledby="vh-title">
            <h2 id="vh-title">History</h2>
            <ol className="timeline">
              {data.events.map((e, i) => (
                <li key={i}>
                  <strong>
                    {e.subject_type === 'section'
                      ? `${titles[e.meta?.key] ?? e.meta?.key}: ${SECTION_STATUS[e.to_status ?? '']?.label ?? e.to_status}`
                      : e.to_status
                        ? VENDOR_STATUS[e.to_status]?.label ?? e.to_status
                        : e.reason}
                  </strong>
                  <div className="muted small">
                    {formatDate(e.created_at)} · {e.actor}
                  </div>
                  {e.subject_type === 'section' && e.reason && <div className="small">“{e.reason}”</div>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
