'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field } from '@/components/ui';
import { SavedNote, useAction } from '../_parts/forms';

export default function VendorPayoutsPage() {
  const { panel, save } = useVendorPanel();
  const payouts = panel.payouts;
  const [invoiceEmail, setInvoiceEmail] = useState(payouts.invoiceEmail);
  const invoice = useAction();

  const saveInvoice = (event: React.FormEvent) => {
    event.preventDefault();
    void invoice.run(() => save('/vendor/payouts', { invoiceEmail: invoiceEmail.trim() }));
  };

  return (
    <div className="vendor-page" style={{ maxWidth: 820 }}>
      <div>
        <h1>Payouts</h1>
        <p className="lead">
          We pay you through Stripe. You enter your identity and bank details on Stripe&apos;s own pages. Honest &amp; Rare never
          sees or stores them; we only see whether your account is ready.
        </p>
      </div>

      {payouts.enabled ? (
        <section className="card spread">
          <div style={{ flex: '1 1 360px' }}>
            <span className="chip chip-done">Payouts enabled</span>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 10 }}>Stripe has everything it needs</div>
            <div className="muted small" style={{ marginTop: 4 }}>
              Your earnings are paid to the bank account you gave Stripe.
            </div>
          </div>
        </section>
      ) : (
        <section className="card card-warn spread">
          <div style={{ flex: '1 1 360px' }}>
            <span className="chip chip-waiting">Waiting for you on Stripe</span>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 10 }}>
              {payouts.requirement ? 'Stripe needs one more document' : 'Finish your payout setup on Stripe'}
            </div>
            {payouts.requirement && (
              <div className="muted small" style={{ marginTop: 4 }}>
                {payouts.requirement}
              </div>
            )}
          </div>
          <Link href="/vendor/stripe-simulated" className="btn btn-primary">
            Continue on Stripe ↗
          </Link>
        </section>
      )}

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>What Stripe checks</h2>
        <ul className="list-plain" style={{ gap: 0 }}>
          {payouts.checks.map((c) => (
            <li key={c.key} className="spread" style={{ padding: '12px 0', borderTop: '1px solid var(--line-soft)', flexWrap: 'nowrap' }}>
              <span className="stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{c.label}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {c.note}
                </span>
              </span>
              <span className={`chip ${c.status === 'done' ? 'chip-done' : 'chip-waiting'}`}>
                {c.status === 'done' ? 'Done' : 'Needs document'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <h2>Commission invoices</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          We send you an invoice for our commission. This is stored by Honest &amp; Rare, not Stripe.
        </p>
        <form className="stack" style={{ gap: 12, maxWidth: 420 }} onSubmit={saveInvoice}>
          <ErrorBox error={invoice.error} />
          <Field label="Invoice email" htmlFor="invoice-email" hint="Leave empty to use your main email.">
            <input
              id="invoice-email"
              type="email"
              autoComplete="email"
              placeholder={panel.account.email}
              value={invoiceEmail}
              onChange={(e) => {
                setInvoiceEmail(e.target.value);
                invoice.clearSaved();
              }}
            />
          </Field>
          <div className="row">
            <button className="btn" disabled={invoice.busy}>
              {invoice.busy ? 'Saving…' : 'Save'}
            </button>
            <SavedNote saved={invoice.saved} />
          </div>
        </form>
        <div className="row-box" style={{ flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Accounting contact</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Created automatically after approval
              {payouts.accountingContactId ? ` · customer number ${payouts.accountingContactId}` : ''}
            </div>
          </div>
          {payouts.accountingContactId ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--good-ink)' }}>✓ Set up</span>
          ) : (
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
              Not yet
            </span>
          )}
        </div>
      </section>

      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Status updates here automatically when Stripe finishes its checks. Questions about your Stripe account? Contact Honest
        &amp; Rare at [support email].
      </p>
    </div>
  );
}
