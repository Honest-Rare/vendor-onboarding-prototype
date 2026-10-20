'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorBox, Field, Loading, StatusBadge } from '@/components/ui';
import { api, ApiError, uploadFile, useLoad } from '@/lib/api';
import { SECTION_STATUS } from '@/lib/labels';
import { displayValue, type FieldDef, type Section } from '@/lib/sections';

function Input({
  field,
  value,
  fileName,
  disabled,
  onChange,
  onFile,
}: {
  field: FieldDef;
  value: any;
  fileName?: string;
  disabled: boolean;
  onChange: (v: any) => void;
  onFile: (f: File) => void;
}) {
  const id = `f-${field.key}`;
  if (field.type === 'checkbox') {
    return (
      <label className="choice">
        <input type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {field.label}
          {field.help && <span className="hint"> {field.help}</span>}
        </span>
      </label>
    );
  }
  return (
    <Field label={field.label} htmlFor={id} required={field.required} hint={field.help}>
      {field.type === 'textarea' ? (
        <textarea id={id} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select id={id} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'document' ? (
        <div className="stack" style={{ gap: 6 }}>
          {value && (
            <span className="small">
              Uploaded:{' '}
              <a href={`/api/files/${value}`} target="_blank" rel="noreferrer">
                {fileName ?? 'file'}
              </a>
            </span>
          )}
          {!disabled && (
            <input id={id} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          )}
        </div>
      ) : (
        <input
          id={id}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          step={field.type === 'number' ? 'any' : undefined}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export default function SectionPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const { data, error } = useLoad<{ sections: Section[] }>('/vendor/overview', '/vendor/login');
  const section = data?.sections.find((s) => s.key === key);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!section) return;
    setValues(section.data ?? {});
    setFileNames(Object.fromEntries(section.files.map((f) => [f.id, f.name])));
  }, [section]);

  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  if (!section || section.reviewer !== 'admin') {
    return (
      <div className="stack">
        <p>This section does not exist.</p>
        <Link href="/vendor">Back to shop setup</Link>
      </div>
    );
  }

  const locked = (section.status === 'approved' || section.status === 'submitted') && !editing;

  const save = async (submit: boolean) => {
    setBusy(true);
    setActionError(null);
    setSaved(false);
    try {
      await api(`/vendor/sections/${key}`, { method: 'PUT', json: { data: values, submit } });
      if (submit) router.push('/vendor');
      else setSaved(true);
    } catch (e) {
      setActionError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (fieldKey: string, file: File) => {
    setActionError(null);
    try {
      const result = await uploadFile('/vendor/uploads', file);
      setValues((v) => ({ ...v, [fieldKey]: result.id }));
      setFileNames((n) => ({ ...n, [result.id]: result.name }));
    } catch (e) {
      setActionError(e as ApiError);
    }
  };

  return (
    <div className="stack narrow">
      <div>
        <Link href="/vendor" className="small">
          ← Shop setup
        </Link>
      </div>
      <div className="spread">
        <h1 style={{ margin: 0 }}>{section.title}</h1>
        <StatusBadge map={SECTION_STATUS} value={section.status} />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {section.description}
      </p>

      {section.status === 'changes_requested' && section.adminNote && (
        <div className="alert alert-warn" role="status">
          <strong>Our team asked:</strong> {section.adminNote}
        </div>
      )}
      {section.status === 'submitted' && !editing && (
        <div className="alert alert-info">Sent for review. Our team is checking this section.</div>
      )}
      {section.status === 'approved' && !editing && <div className="alert alert-good">Approved by our team.</div>}

      <ErrorBox error={actionError} />
      {saved && <div className="alert alert-good">Draft saved.</div>}

      <div className="card stack">
        {locked ? (
          <dl className="facts">
            {section.fields.map((f) => (
              <div key={f.key} style={{ display: 'contents' }}>
                <dt>{f.label}</dt>
                <dd style={{ whiteSpace: 'pre-line' }}>{displayValue(f, values[f.key], section.files)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          section.fields.map((f) => (
            <Input
              key={f.key}
              field={f}
              value={values[f.key]}
              fileName={fileNames[values[f.key]]}
              disabled={busy}
              onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
              onFile={(file) => void upload(f.key, file)}
            />
          ))
        )}
      </div>

      <div className="row">
        {locked ? (
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Edit and send for review again
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save(true)}>
              Send for review
            </button>
            {section.status !== 'approved' && (
              <button type="button" className="btn" disabled={busy} onClick={() => void save(false)}>
                Save draft
              </button>
            )}
          </>
        )}
      </div>
      {editing && section.status === 'approved' && (
        <p className="muted small">Changes to an approved section are checked again by our team.</p>
      )}
    </div>
  );
}
