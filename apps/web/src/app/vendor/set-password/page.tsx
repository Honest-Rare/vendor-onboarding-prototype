'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorBox, Loading } from '@/components/ui';
import { api, ApiError, formatDate } from '@/lib/api';

const MIN_LENGTH = 12;

type Invite = { firstName: string; email: string; expiresAt: string };

function SetPassword() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [twoFactor, setTwoFactor] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendNote, setResendNote] = useState(false);

  useEffect(() => {
    api<Invite>(`/auth/set-password${token ? `?token=${encodeURIComponent(token)}` : ''}`)
      .then(setInvite)
      .catch((e) => setLoadError(e instanceof ApiError ? e : new ApiError(String(e), 0)));
  }, [token]);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = repeat.length > 0 && password !== repeat;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_LENGTH || password !== repeat) return;
    setBusy(true);
    setError(null);
    try {
      await api('/auth/set-password', { json: { token, password, twoFactor } });
      router.replace('/vendor');
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
      setBusy(false);
    }
  };

  if (loadError) return <ErrorBox error={loadError} />;
  if (!invite) return <Loading />;

  return (
    <>
      <form
        className="card stack"
        style={{ padding: 28, gap: 14 }}
        onSubmit={(e) => void submit(e)}
        noValidate
      >
        <span className="chip chip-done" style={{ alignSelf: 'flex-start' }}>
          Application approved
        </span>
        <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Welcome, {invite.firstName}. Set your password</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          This link works once and expires on {formatDate(invite.expiresAt)}. You&apos;ll sign in with{' '}
          <strong style={{ overflowWrap: 'anywhere' }}>{invite.email}</strong>.
        </p>
        <ErrorBox error={error} />
        <div className="field">
          <label htmlFor="pw">New password</label>
          <input
            id="pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={tooShort}
            aria-describedby="pw-hint"
          />
          <p id="pw-hint" className="hint" style={tooShort ? { color: 'var(--bad-ink)' } : undefined}>
            At least {MIN_LENGTH} characters.
          </p>
        </div>
        <div className="field">
          <label htmlFor="pw2">Repeat password</label>
          <input
            id="pw2"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-invalid={mismatch}
            aria-describedby={mismatch ? 'pw2-error' : undefined}
          />
          {mismatch && (
            <p id="pw2-error" className="hint" style={{ color: 'var(--bad-ink)' }}>
              The passwords do not match.
            </p>
          )}
        </div>
        <div className="row" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'nowrap', padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
          <input
            id="tfa"
            type="checkbox"
            checked={twoFactor}
            onChange={(e) => setTwoFactor(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, flex: 'none' }}
          />
          <label htmlFor="tfa" style={{ fontSize: 14, lineHeight: 1.4 }}>
            <strong>Turn on two-factor sign-in</strong> (recommended)
            <br />
            <span className="muted" style={{ fontSize: 13 }}>
              You&apos;ll scan a code with an authenticator app next.
            </span>
          </label>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 4, padding: 14, fontSize: 15, width: '100%' }}
          disabled={busy || password.length < MIN_LENGTH || password !== repeat}
        >
          {busy ? 'Saving…' : 'Set password and continue'}
        </button>
      </form>
      <p className="muted" style={{ margin: 0, fontSize: 12, textAlign: 'center' }}>
        Link expired?{' '}
        <button type="button" className="link-button" onClick={() => setResendNote(true)}>
          Send me a new one
        </button>
      </p>
      {resendNote && (
        <p className="simulated" role="status">
          Prototype: no email is sent. In the real panel a new link goes to the address on your application.
        </p>
      )}
    </>
  );
}

/** Rendered without the vendor sidebar. */
export default function SetPasswordPage() {
  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '64px 16px', minHeight: '100vh' }}>
      <div className="stack" style={{ width: '100%', maxWidth: 440, gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Link href="/" className="brand">
            Honest <span>&amp;</span> Rare
          </Link>
          <div className="muted" style={{ fontSize: 13 }}>
            Vendor panel
          </div>
        </div>
        <Suspense fallback={<Loading />}>
          <SetPassword />
        </Suspense>
      </div>
    </main>
  );
}
