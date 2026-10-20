'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorBox, Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

function SetPassword() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const mismatch = repeat.length > 0 && password !== repeat;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== repeat) return;
    setBusy(true);
    setError(null);
    try {
      await api('/auth/set-password', { json: { token, password } });
      router.replace('/vendor');
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} style={{ maxWidth: 460 }}>
      <ErrorBox error={error} />
      <Field label="New password" htmlFor="pw" required hint="At least 10 characters">
        <input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Repeat password" htmlFor="pw2" required>
        <input id="pw2" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-invalid={mismatch} />
      </Field>
      {mismatch && <p className="small" style={{ color: 'var(--bad-ink)', margin: 0 }}>The passwords do not match.</p>}
      <div>
        <button className="btn btn-primary" disabled={busy || password.length < 10 || password !== repeat}>
          {busy ? 'Saving…' : 'Set password and open vendor panel'}
        </button>
      </div>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="stack">
      <h1>Welcome to Honest &amp; Rare</h1>
      <p className="muted">Your application is approved. Set a password to open your vendor panel.</p>
      <Suspense>
        <SetPassword />
      </Suspense>
    </div>
  );
}
