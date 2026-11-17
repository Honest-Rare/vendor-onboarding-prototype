'use client';

import Link from 'next/link';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox } from '@/components/ui';
import { gateChecks, readyToGoLive, type GateCheck } from '@/lib/vendor-panel';
import { useAction } from '../_parts/forms';

/** Where the vendor fixes a failing check. */
function fixHref(c: GateCheck) {
  switch (c.key) {
    case 'payouts':
      return '/vendor/payouts';
    case 'identity':
      return '/vendor/legal#identity';
    case 'dac7_lucid':
      return c.state === 'DAC7 missing' ? '/vendor/legal#tax' : '/vendor/legal#lucid';
    case 'food':
      return '/vendor/legal#food';
    case 'profile':
      return '/vendor/shop';
    case 'product':
      return '/vendor/products';
    case 'shipping':
      return '/vendor/shipping';
    default:
      return '/vendor';
  }
}

function HonestRareChecks() {
  return (
    <section className="card">
      <h2 style={{ marginBottom: 8 }}>What Honest &amp; Rare checks</h2>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
        <li>Your trade register extract matches your application</li>
        <li>Your shop page and legal notice are complete and accurate</li>
      </ul>
    </section>
  );
}

export default function VendorGoLivePage() {
  const { panel, save } = useVendorPanel();
  const checks = gateChecks(panel);
  const ready = readyToGoLive(panel);
  const submitted = panel.stage === 'submitted';
  const live = panel.stage === 'live';
  const send = useAction();
  const passed = checks.filter((c) => c.ok).length;

  if (live) {
    return (
      <div className="vendor-page narrow">
        <div>
          <h1>Your shop is live</h1>
          <p className="lead">
            Customers can find and buy from your shop. <Link href="/vendor">Back to the overview</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-page narrow">
      {submitted ? (
        <div>
          <span className="chip chip-progress">Sent for final approval</span>
          <h1 style={{ marginTop: 10 }}>We&apos;re taking a final look</h1>
          <p className="lead">
            Nothing is visible to customers until Honest &amp; Rare approves your shop. We&apos;ll email you when your shop is
            live, usually within [X] working days. If something needs changing, it appears on your overview with a note.
          </p>
        </div>
      ) : ready ? (
        <div>
          <h1>You&apos;re ready to go live</h1>
          <p className="lead">
            Every automatic check has passed. Send your shop to Honest &amp; Rare for a final look. Nothing is visible to customers
            until we approve it.
          </p>
        </div>
      ) : (
        <div>
          <h1>Not ready to go live yet</h1>
          <p className="lead">
            {passed} of {checks.length} automatic checks have passed. Once every check passes, you can send your shop to Honest
            &amp; Rare for a final look.
          </p>
        </div>
      )}

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Automatic checks</h2>
        <ul className="list-plain" style={{ gap: 8 }}>
          {checks.map((c) => (
            <li key={c.key} className="row" style={{ gap: 10, fontSize: 14, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <span className={`check-dot ${c.ok ? 'ok' : 'open'}`} aria-hidden="true" style={{ marginTop: 1 }}>
                {c.ok ? '✓' : ''}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {c.label}
                <span className="visually-hidden">{c.ok ? ': passed' : ': not passed'}</span>
                {!c.ok && (
                  <>
                    {c.state && <span className="muted"> · {c.state}</span>}{' '}
                    <Link href={fixHref(c)} aria-label={`Fix: ${c.label}`} style={{ whiteSpace: 'nowrap' }}>
                      Fix this
                    </Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <HonestRareChecks />

      {!submitted && (
        <div className="stack" style={{ gap: 8 }}>
          <ErrorBox error={send.error} />
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '14px 20px', fontSize: 15 }}
              disabled={!ready || send.busy}
              aria-describedby={ready ? undefined : 'golive-locked'}
              onClick={() => void send.run(() => save('/vendor/go-live', {}, 'POST'))}
            >
              {send.busy ? 'Sending…' : 'Send for final approval'}
            </button>
            {ready && (
              <Link href="/vendor/shop" style={{ fontSize: 14 }}>
                Preview your shop page first
              </Link>
            )}
          </div>
          {!ready && (
            <p id="golive-locked" className="muted small" style={{ margin: 0 }}>
              Available once every automatic check has passed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
