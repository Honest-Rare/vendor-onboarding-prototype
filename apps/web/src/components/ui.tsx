'use client';

import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api';
import type { Tone } from '@/lib/labels';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ map, value }: { map: Record<string, { label: string; tone: Tone }>; value: string }) {
  const entry = map[value] ?? { label: value, tone: 'neutral' as Tone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function ErrorBox({ error }: { error: ApiError | Error | null | undefined }) {
  if (!error) return null;
  const errors = 'errors' in error ? error.errors : [];
  return (
    <div className="alert alert-bad" role="alert">
      <strong>{error.message}</strong>
      {errors.length > 0 && (
        <ul>
          {errors.map((e) => (
            <li key={e.path + e.message}>{e.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Loading() {
  return <p className="muted">Loading…</p>;
}

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label}
        {required ? '' : <span className="optional"> (optional)</span>}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function SimulatedNote({ children }: { children: ReactNode }) {
  return <p className="simulated">{children}</p>;
}
