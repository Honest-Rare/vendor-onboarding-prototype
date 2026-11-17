'use client';

import { useRef, useState } from 'react';
import { ApiError, uploadFile } from '@/lib/api';
import type { FileRef } from '@/lib/vendor-panel';

/** Busy / error / "Saved" state for one form or button on a vendor page. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
      setSaved(true);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, saved, run, clearSaved: () => setSaved(false) };
}

/** Short confirmation next to a save button. Always rendered so screen readers announce the change. */
export function SavedNote({ saved, text = 'Saved' }: { saved: boolean; text?: string }) {
  return (
    <span role="status" className="small" style={{ color: 'var(--good-ink)', fontWeight: 600 }}>
      {saved ? `✓ ${text}` : ''}
    </span>
  );
}

/** "Done" / "To do" chip for a section, from a status helper in lib/vendor-panel. */
export function DoneChip({ done }: { done: boolean }) {
  return <span className={`chip ${done ? 'chip-done' : 'chip-todo'}`}>{done ? 'Done' : 'To do'}</span>;
}

/** A small button that picks a file, uploads it and hands back a FileRef. */
export function UploadButton({
  label,
  context,
  accept,
  disabled,
  onUploaded,
}: {
  label: string;
  /** What is uploaded, for screen readers: "Upload organic certificate". */
  context: string;
  accept?: string;
  disabled?: boolean;
  onUploaded: (file: FileRef) => Promise<unknown>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useAction();

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void run(async () => {
      const up = await uploadFile('/vendor/uploads', file);
      await onUploaded({ id: up.id, name: up.name, uploadedAt: new Date().toISOString() });
    });
    if (input.current) input.current.value = '';
  };

  return (
    <span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
      <button
        type="button"
        className="btn btn-small"
        aria-label={`${label} ${context}`}
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
      >
        {busy ? 'Uploading…' : label}
      </button>
      <input ref={input} type="file" hidden accept={accept ?? '.pdf,.jpg,.jpeg,.png'} onChange={(e) => pick(e.target.files)} />
      {error && (
        <span role="alert" className="small" style={{ color: 'var(--bad-ink)' }}>
          {error.message}
        </span>
      )}
    </span>
  );
}
