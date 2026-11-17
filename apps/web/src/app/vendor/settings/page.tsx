// LATER(P2): confirm email changes by email, password reset by link, two-factor set-up with an authenticator app.
'use client';

import { useState } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field, SimulatedNote } from '@/components/ui';
import { formatDate } from '@/lib/api';
import type { VendorPanel } from '@/lib/vendor-panel';
import { SavedNote, useAction } from '../_parts/forms';

type Account = VendorPanel['account'];

const rowBox: React.CSSProperties = { flexWrap: 'wrap', padding: 12 };

export default function VendorSettingsPage() {
  const { panel, save } = useVendorPanel();
  const account = panel.account;
  const saveAccount = (patch: Partial<Account>) => save('/vendor/settings', patch);

  const [editEmail, setEditEmail] = useState(false);
  const [email, setEmail] = useState(account.email);
  const emailAction = useAction();

  const [passwordNote, setPasswordNote] = useState(false);
  const twoFactorAction = useAction();
  const languageAction = useAction();

  return (
    <div className="vendor-page narrow">
      <h1>Settings</h1>

      <section className="card stack" style={{ gap: 12 }}>
        <h2>Sign-in and security</h2>

        <div className="stack" style={{ gap: 8 }}>
          <div className="row-box" style={rowBox}>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Email</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {account.email}
              </div>
            </div>
            {!editEmail && (
              <button
                type="button"
                className="link-button"
                style={{ fontSize: 14 }}
                aria-label="Change email"
                onClick={() => {
                  setEmail(account.email);
                  setEditEmail(true);
                  emailAction.clearSaved();
                }}
              >
                Change
              </button>
            )}
            <SavedNote saved={emailAction.saved && !editEmail} />
          </div>
          {editEmail && (
            <form
              className="stack"
              style={{ gap: 12, padding: 12, border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)' }}
              onSubmit={async (e) => {
                e.preventDefault();
                if (await emailAction.run(() => saveAccount({ email: email.trim() }))) setEditEmail(false);
              }}
            >
              <ErrorBox error={emailAction.error} />
              <Field label="New email" htmlFor="new-email" required>
                <input id="new-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <SimulatedNote>Prototype: the change applies right away. The real panel confirms the new address by email first.</SimulatedNote>
              <div className="row">
                <button className="btn btn-primary" disabled={emailAction.busy || !email.includes('@')}>
                  {emailAction.busy ? 'Saving…' : 'Save email'}
                </button>
                <button type="button" className="btn" onClick={() => setEditEmail(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <div className="row-box" style={rowBox}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Password</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Set on {formatDate(account.passwordSetAt)}
              </div>
            </div>
            <button
              type="button"
              className="link-button"
              style={{ fontSize: 14 }}
              aria-expanded={passwordNote}
              onClick={() => setPasswordNote(!passwordNote)}
            >
              Change password
            </button>
          </div>
          {passwordNote && (
            <SimulatedNote>
              Prototype: in the real panel we email you a link to set a new password, the same way you set your first one.
            </SimulatedNote>
          )}
        </div>

        <div className="stack" style={{ gap: 8 }}>
          {account.twoFactor ? (
            <div className="row-box" style={rowBox}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Two-factor sign-in <span className="chip chip-done">On</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  You confirm each sign-in with your authenticator app
                </div>
              </div>
              <button
                type="button"
                className="btn btn-small"
                disabled={twoFactorAction.busy}
                onClick={() => void twoFactorAction.run(() => saveAccount({ twoFactor: false }))}
              >
                {twoFactorAction.busy ? 'Saving…' : 'Turn off'}
              </button>
            </div>
          ) : (
            <div className="row-box" style={{ ...rowBox, borderColor: 'var(--warn-line)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Two-factor sign-in{' '}
                  <span className="chip chip-waiting" style={{ padding: '2px 8px' }}>
                    Recommended
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Off · protects your payouts and shop if your password leaks
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={twoFactorAction.busy}
                onClick={() => void twoFactorAction.run(() => saveAccount({ twoFactor: true }))}
              >
                {twoFactorAction.busy ? 'Turning on…' : 'Turn on'}
              </button>
            </div>
          )}
          <ErrorBox error={twoFactorAction.error} />
          {twoFactorAction.saved && account.twoFactor && (
            <SimulatedNote>Prototype: turned on straight away. The real panel asks you to scan a code with an authenticator app first.</SimulatedNote>
          )}
        </div>
      </section>

      <section className="card stack" style={{ gap: 8 }}>
        <h2>Change review</h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          Changes to your products and shop page are <strong>reviewed by Honest &amp; Rare</strong> before customers see them.
        </p>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Set by Honest &amp; Rare for each vendor. Questions? Contact us at [support email].
        </p>
      </section>

      <section className="card stack" style={{ gap: 10 }}>
        <h2>Language</h2>
        <div style={{ maxWidth: 320 }}>
          <Field label="Language for emails and the vendor panel" htmlFor="language" required>
            <select
              id="language"
              value={account.language}
              disabled={languageAction.busy}
              onChange={(e) => void languageAction.run(() => saveAccount({ language: e.target.value as Account['language'] }))}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
        <ErrorBox error={languageAction.error} />
        <SavedNote saved={languageAction.saved} />
      </section>
    </div>
  );
}
