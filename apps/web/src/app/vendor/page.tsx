// LATER(P2): pause shop (holiday, stock) and a public shop page for "View your shop".
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { gateChecks, PRODUCT_STATUS, productSummary, readyToGoLive, setupProgress, setupSteps, type LiveTask, type Product, type VendorPanel } from '@/lib/vendor-panel';

export default function VendorOverviewPage() {
  const { panel } = useVendorPanel();
  return panel.stage === 'live' ? <LiveOverview panel={panel} /> : <OnboardingOverview panel={panel} />;
}

// Before go-live -------------------------------------------------------------------------------------

function OnboardingOverview({ panel }: { panel: VendorPanel }) {
  const steps = setupSteps(panel);
  const progress = setupProgress(panel);
  const checks = gateChecks(panel);
  const ready = readyToGoLive(panel);
  const submitted = panel.stage === 'submitted';
  const percent = Math.round((progress.done / progress.total) * 100);

  return (
    <div className="vendor-page">
      <div>
        <h1>Welcome, {panel.account.firstName}</h1>
        <p className="lead">
          Your shop isn&apos;t visible to customers yet. Build your shop page and finish business setup side by side, in any order. When
          every check passes, send your shop for final approval.
        </p>
      </div>

      {submitted && (
        <section aria-label="Final approval" className="alert alert-info">
          <strong>Your shop was sent for final approval.</strong> Nothing is visible to customers yet. We&apos;ll email you when an
          Honest &amp; Rare admin has checked it.
        </section>
      )}

      {!panel.payouts.enabled && panel.payouts.requirement && (
        <section aria-label="Action needed" className="card card-warn" style={{ padding: '16px 20px' }}>
          <div className="row" style={{ gap: 16 }}>
            <div style={{ flex: '1 1 360px' }}>
              <div className="eyebrow" style={{ color: 'var(--warn-ink)' }}>
                Action needed · Stripe
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Stripe needs one more document to enable payouts</div>
              <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
                {panel.payouts.requirement}
              </div>
            </div>
            <Link href="/vendor/payouts" className="btn btn-primary">
              Go to payouts
            </Link>
          </div>
        </section>
      )}

      <section className="card">
        <div className="spread" style={{ fontSize: 14, gap: 8 }}>
          <span style={{ fontWeight: 600 }}>Setup progress</span>
          <span className="muted">
            {progress.done} of {progress.total} steps done
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          style={{ marginTop: 10, height: 8, borderRadius: 4, background: 'var(--line)' }}
        >
          <div style={{ width: `${percent}%`, height: 8, borderRadius: 4, background: 'var(--accent)' }} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 24, alignItems: 'start' }}>
        <section className="card">
          <h2>Shop page</h2>
          <p className="card-sub">Start any time. Only you can see it until it goes live.</p>
          {steps.shop.map((s) => (
            <StepRow key={s.key} step={s} />
          ))}
        </section>
        <section className="card">
          <h2>Business setup</h2>
          <p className="card-sub">Needed before you can sell. Runs alongside your shop page.</p>
          {steps.business.map((s) => (
            <StepRow key={s.key} step={s} />
          ))}
        </section>
      </div>

      <section className="card">
        <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 420px' }}>
            <h2>Ready to go live?</h2>
            <p className="muted" style={{ margin: '4px 0 12px', fontSize: 13 }}>
              These checks run automatically. When all pass, an Honest &amp; Rare admin gives final approval.
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checks.map((c) => (
                <li key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
                  <span aria-hidden="true" className={`check-dot ${c.ok ? 'ok' : 'open'}`}>
                    {c.ok ? '✓' : ''}
                  </span>
                  <span>
                    {c.label}
                    <span className="visually-hidden">{c.ok ? ': passed' : ': not yet'}</span>
                  </span>
                  {c.state && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      {c.state}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {submitted ? (
              <button type="button" className="btn" disabled>
                Sent for final approval
              </button>
            ) : ready ? (
              <Link href="/vendor/go-live" className="btn btn-primary">
                Send for final approval
              </Link>
            ) : (
              <button type="button" className="btn" disabled style={{ background: '#d5d9d6', borderColor: '#d5d9d6', color: '#4a504c', opacity: 1 }}>
                Send for final approval
              </button>
            )}
            {!ready && !submitted && (
              <span className="muted" style={{ fontSize: 13 }}>
                Available when every check passes.
              </span>
            )}
            <Link href="/vendor/go-live" style={{ fontSize: 14 }}>
              See the go-live step
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepRow({ step: { name, note, chip, href } }: { step: ReturnType<typeof setupSteps>["shop"][number] }) {
  return (
    <Link href={href} className="step-row">
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
        <span className="muted" style={{ fontSize: 13 }}>
          {note}
        </span>
      </span>
      <span className={`chip chip-${chip.tone}`}>{chip.label}</span>
    </Link>
  );
}

// After go-live --------------------------------------------------------------------------------------

const TASK_STYLE: Record<LiveTask['kind'], { tag: string; ink: string; border: string }> = {
  expires: { tag: 'Expires soon', ink: 'var(--bad-ink)', border: '#e9b4ac' },
  in_review: { tag: 'In review', ink: 'var(--warn-ink)', border: 'var(--warn-line)' },
  yearly: { tag: 'Yearly', ink: 'var(--info-ink)', border: '#b9cbe3' },
};

function productNote(p: Product) {
  if (p.status === 'returned') return p.note ?? '';
  if (p.status === 'in_review') return 'Usually within [X] working days';
  return '';
}

function LiveOverview({ panel }: { panel: VendorPanel }) {
  const [pauseNote, setPauseNote] = useState(false);

  return (
    <div className="vendor-page">
      <div className="spread" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1>Your shop is live</h1>
          <p className="lead">Customers can see your shop page and approved products.</p>
        </div>
        <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
          <div className="row" style={{ gap: 8 }}>
            <Link href="/vendor/shop#preview" className="btn" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              View your shop
            </Link>
            <button type="button" className="btn" style={{ fontWeight: 400 }} aria-expanded={pauseNote} onClick={() => setPauseNote((v) => !v)}>
              Pause shop (holiday, stock)
            </button>
          </div>
          {pauseNote && (
            <p className="simulated" role="status">
              Prototype: pausing comes later.
            </p>
          )}
        </div>
      </div>

      {panel.liveTasks.length > 0 && (
        <section aria-labelledby="tasks-heading" className="stack" style={{ gap: 12 }}>
          <h2 id="tasks-heading" style={{ margin: 0, fontSize: 17 }}>
            Things to do
          </h2>
          {panel.liveTasks.map((t) => {
            const st = TASK_STYLE[t.kind];
            return (
              <div key={t.id} className="card row" style={{ padding: '16px 20px', gap: 16, borderColor: st.border }}>
                <div style={{ flex: '1 1 360px' }}>
                  <div className="eyebrow" style={{ color: st.ink }}>
                    {st.tag}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{t.title}</div>
                  <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
                    {t.detail}
                  </div>
                </div>
                <Link href={t.href} style={{ fontSize: 14, fontWeight: 600 }}>
                  {t.action}
                </Link>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <div className="spread" style={{ gap: 8, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Products</h2>
          <Link href="/vendor/products/new" className="btn btn-primary">
            Add product
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 520, fontSize: 14 }}>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Status</th>
                <th scope="col">Note from Honest &amp; Rare</th>
              </tr>
            </thead>
            <tbody>
              {panel.products.map((p) => {
                const status = PRODUCT_STATUS[p.status];
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/vendor/products/${p.id}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {p.name || 'Untitled product'}
                      </Link>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {productSummary(p)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${status.tone}`}>{status.label}</span>
                    </td>
                    <td className="muted">{productNote(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
