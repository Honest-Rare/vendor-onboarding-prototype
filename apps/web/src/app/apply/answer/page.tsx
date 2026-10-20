'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StorefrontShell } from '@/components/StorefrontShell';
import { ErrorBox, Field, Loading } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

function Answer() {
  const token = useSearchParams().get('token') ?? '';
  const [question, setQuestion] = useState<{ shopName: string; question: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/applications/question?token=${encodeURIComponent(token)}`)
      .then(setQuestion)
      .catch(setError);
  }, [token]);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/applications/answer', { json: { token, answer } });
      setDone(true);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card stack">
        <h1>Thank you</h1>
        <p>Your answer is with our team and your application is back in review.</p>
      </div>
    );
  }
  if (error && !question) {
    return (
      <div className="card stack">
        <h1>This link does not work</h1>
        <ErrorBox error={error} />
      </div>
    );
  }
  if (!question) return <Loading />;
  return (
    <div className="card stack">
      <h1>A question about your application</h1>
      <p className="muted">For {question.shopName}</p>
      <blockquote className="alert alert-info" style={{ margin: 0 }}>
        {question.question}
      </blockquote>
      <ErrorBox error={error} />
      <Field label="Your answer" htmlFor="answer" required>
        <textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </Field>
      <div>
        <button type="button" className="btn btn-primary" disabled={busy || answer.trim().length < 2} onClick={() => void send()}>
          {busy ? 'Sending…' : 'Send answer'}
        </button>
      </div>
    </div>
  );
}

export default function AnswerPage() {
  return (
    <StorefrontShell>
      <main className="container narrow">
        <Suspense fallback={<Loading />}>
          <Answer />
        </Suspense>
      </main>
    </StorefrontShell>
  );
}
