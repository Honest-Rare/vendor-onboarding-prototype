'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge, ErrorBox, Field, Loading, SimulatedNote, StatusBadge } from '@/components/ui';
import { api, ApiError, formatDate, useLoad } from '@/lib/api';
import {
  AI_RECOMMENDATION,
  APPLICATION_STATUS,
  ASSESSMENT,
  BUSINESS_TYPES,
  CATEGORY_LABELS,
  CRITERIA,
  MAKES_OWN,
  PLANS,
  RULE_OUTCOME,
} from '@/lib/labels';

type Check = { status: 'pending' | 'done' | 'failed'; result: any; error: string | null; updated_at: string } | null;
type Detail = {
  id: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  data: any;
  photos: Array<{ id: string; name: string }>;
  rules: Check;
  ai: Check;
  questions: Array<{ id: string; question: string; answer: string | null; asked_at: string; answered_at: string | null }>;
  events: Array<{ from_status: string | null; to_status: string | null; actor: string; reason: string | null; message: string | null; created_at: string; subject_type: string }>;
  vendorId: string | null;
};

type Action = 'approve' | 'ask' | 'reject' | null;

const REJECT_TEMPLATE =
  'Thank you for applying to sell on Honest & Rare and for telling us about your products.\n\n' +
  'After reviewing your application, we are not able to offer you a place at the moment. [Reason in one or two friendly sentences.]\n\n' +
  'You are welcome to apply again in the future.';

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useLoad<Detail>(`/admin/applications/${id}`, '/admin/login', (d) =>
    d.status === 'submitted' || d.rules?.status === 'pending' || d.ai?.status === 'pending',
  );
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const d = data.data;
  const ai = data.ai?.status === 'done' ? data.ai.result : null;
  const decidable = data.status === 'in_review';

  const open = (next: Action) => {
    setAction(next);
    setActionError(null);
    setReason('');
    setText(next === 'ask' ? ai?.suggestedQuestion ?? '' : next === 'reject' ? REJECT_TEMPLATE : '');
  };

  const send = async () => {
    setBusy(true);
    setActionError(null);
    try {
      if (action === 'approve') await api(`/admin/applications/${id}/approve`, { json: { reason } });
      if (action === 'ask') await api(`/admin/applications/${id}/ask`, { json: { question: text } });
      if (action === 'reject') await api(`/admin/applications/${id}/reject`, { json: { reason, message: text } });
      setAction(null);
      await reload();
    } catch (e) {
      setActionError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const rescreen = async () => {
    await api(`/admin/applications/${id}/rescreen`, { method: 'POST' });
    await reload();
  };

  return (
    <div className="stack">
      <div>
        <Link href="/admin" className="small">
          ← All applications
        </Link>
      </div>
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{d.business.shopName}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {d.business.legalName} · applied {formatDate(data.submittedAt ?? data.createdAt)}
          </p>
        </div>
        <StatusBadge map={APPLICATION_STATUS} value={data.status} />
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {/* 1. The application ------------------------------------------------ */}
          <section className="card" aria-labelledby="app-title">
            <div className="card-label">Application</div>
            <h2 id="app-title">What they told us</h2>
            <dl className="facts">
              <dt>Business type</dt>
              <dd>{BUSINESS_TYPES[d.business.type]}</dd>
              <dt>Registered in</dt>
              <dd>{d.business.country}</dd>
              <dt>VAT ID</dt>
              <dd>{d.business.vatId || '—'}</dd>
              {d.business.taxNumber && (
                <>
                  <dt>Tax number</dt>
                  <dd>{d.business.taxNumber}</dd>
                </>
              )}
              {d.business.registerNumber && (
                <>
                  <dt>Trade register</dt>
                  <dd>
                    {d.business.registerNumber} {d.business.registerCourt}
                  </dd>
                </>
              )}
              <dt>Address</dt>
              <dd>
                {d.business.address.street}, {d.business.address.postcode} {d.business.address.city}
              </dd>
              <dt>Contact</dt>
              <dd>
                {d.contact.firstName} {d.contact.lastName}
                {d.contact.role && `, ${d.contact.role}`}
                <br />
                {d.contact.email} · {d.contact.phone}
              </dd>
              <dt>Website</dt>
              <dd>{d.contact.website || '—'}</dd>
              {d.contact.socialLinks && (
                <>
                  <dt>Social</dt>
                  <dd>{d.contact.socialLinks}</dd>
                </>
              )}
              <dt>Sells</dt>
              <dd>{d.products.categories.map((c: string) => CATEGORY_LABELS[c] ?? c).join(', ')}</dd>
              <dt>Makes own products</dt>
              <dd>{MAKES_OWN[d.products.makesOwnProducts]}</dd>
              <dt>Products</dt>
              <dd>
                About {d.products.productCount}, {d.products.priceRange}
              </dd>
              <dt>Sells today</dt>
              <dd>{d.products.whereSoldToday || '—'}</dd>
              <dt>Plan</dt>
              <dd>{PLANS[d.agreement.plan]?.name ?? d.agreement.plan}</dd>
            </dl>
            <h3 style={{ marginTop: 16 }}>Their story</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{d.products.story}</p>
            <h3>Sample photos</h3>
            <div className="photos">
              {data.photos.map((p) => (
                <a key={p.id} href={`/api/files/${p.id}`} target="_blank" rel="noreferrer">
                  <img src={`/api/files/${p.id}`} alt={`Sample photo: ${p.name}`} />
                </a>
              ))}
            </div>
          </section>

          {/* 2. Rules: facts --------------------------------------------------- */}
          <section className="card" aria-labelledby="rules-title">
            <div className="spread">
              <div>
                <div className="card-label">Rules engine · facts</div>
                <h2 id="rules-title">Checks</h2>
              </div>
              {['submitted', 'in_review', 'needs_info'].includes(data.status) && (
                <button type="button" className="btn btn-small" onClick={() => void rescreen()}>
                  Rerun checks
                </button>
              )}
            </div>
            {!data.rules || data.rules.status === 'pending' ? (
              <p className="muted">Checks are running…</p>
            ) : data.rules.status === 'failed' ? (
              <div className="alert alert-bad">Checks failed: {data.rules.error}. Rerun them.</div>
            ) : (
              <ul className="list-plain">
                {data.rules.result.map((r: any) => (
                  <li key={r.code} className="check-item">
                    <StatusBadge map={RULE_OUTCOME} value={r.outcome} />
                    <div>
                      <strong>{r.label}</strong>
                      <div className="muted small">{r.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3. AI: advice ----------------------------------------------------- */}
          <section className="card card-advice" aria-labelledby="ai-title">
            <div className="card-label">AI screening · advice, not a decision</div>
            <h2 id="ai-title">Screening against our criteria</h2>
            {!data.ai || data.ai.status === 'pending' ? (
              <p className="muted">Not screened yet. Screening is running…</p>
            ) : data.ai.status === 'failed' ? (
              <div className="alert alert-warn">
                Screening failed ({data.ai.error}). You can still decide, or rerun the checks.
              </div>
            ) : (
              <div className="stack">
                {ai.simulated && (
                  <SimulatedNote>
                    Simulated AI: this is a scripted example result. No AI model has read this application.
                  </SimulatedNote>
                )}
                <div className="row">
                  <StatusBadge map={AI_RECOMMENDATION} value={ai.recommendation} />
                  {ai.confidence !== null && <span className="muted small">Confidence {Math.round(ai.confidence * 100)}%</span>}
                </div>
                <p style={{ margin: 0 }}>{ai.summary}</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Criterion</th>
                        <th scope="col">Finding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ai.criteria.map((c: any) => (
                        <tr key={c.criterion}>
                          <td>
                            <strong>{CRITERIA[c.criterion]}</strong>
                            <div style={{ marginTop: 4 }}>
                              <StatusBadge map={ASSESSMENT} value={c.assessment} />
                            </div>
                          </td>
                          <td>
                            {c.note}
                            {c.source && <div className="muted small">Source: {c.source}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {ai.flags.length > 0 && (
                  <div>
                    <h3>Flags</h3>
                    <ul className="list-plain">
                      {ai.flags.map((f: any) => (
                        <li key={f.title} className="check-item">
                          <Badge tone={f.severity === 'critical' ? 'bad' : f.severity === 'warning' ? 'warn' : 'info'}>
                            {f.severity === 'critical' ? 'Critical' : f.severity === 'warning' ? 'Warning' : 'Info'}
                          </Badge>
                          <div>
                            <strong>{f.title}</strong>
                            <div className="muted small">
                              {f.detail}
                              {f.source && ` (${f.source})`}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ai.sourcesChecked.length > 0 && (
                  <p className="muted small" style={{ margin: 0 }}>
                    Pages read: {ai.sourcesChecked.join(', ')}
                  </p>
                )}
                <p className="muted small" style={{ margin: 0 }}>
                  {ai.provider} · prompt {ai.promptVersion}
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="detail-side">
          {/* Decision -------------------------------------------------------- */}
          <section className="card stack" aria-labelledby="decide-title">
            <h2 id="decide-title" style={{ margin: 0 }}>
              Decision
            </h2>
            {data.status === 'submitted' && <p className="muted">Waiting for checks to finish.</p>}
            {data.status === 'email_unconfirmed' && <p className="muted">The applicant has not confirmed their email yet.</p>}
            {data.status === 'needs_info' && <p className="muted">Waiting for the applicant to answer your question.</p>}
            {data.status === 'approved' && (
              <div className="alert alert-good">
                Approved. The vendor is setting up their shop.{' '}
                {data.vendorId && <Link href={`/admin/vendors/${data.vendorId}`}>Open vendor checks</Link>}
              </div>
            )}
            {data.status === 'rejected' && <div className="alert alert-bad">Rejected.</div>}

            {decidable && !action && (
              <div className="stack" style={{ gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={() => open('approve')}>
                  Approve
                </button>
                <button type="button" className="btn" onClick={() => open('ask')}>
                  Ask for more information
                </button>
                <button type="button" className="btn btn-danger" onClick={() => open('reject')}>
                  Reject
                </button>
              </div>
            )}

            {decidable && action && (
              <div className="stack">
                <ErrorBox error={actionError} />
                {action !== 'ask' && (
                  <Field label="Reason (internal)" htmlFor="reason" required hint="Kept in the audit log">
                    <textarea id="reason" style={{ minHeight: 80 }} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                )}
                {action === 'ask' && (
                  <Field label="Question for the applicant" htmlFor="question" required hint="Sent by email with a secure answer link">
                    <textarea id="question" value={text} onChange={(e) => setText(e.target.value)} />
                  </Field>
                )}
                {action === 'reject' && (
                  <Field label="Message to the applicant" htmlFor="message" required hint="Edit the draft before sending">
                    <textarea id="message" style={{ minHeight: 200 }} value={text} onChange={(e) => setText(e.target.value)} />
                  </Field>
                )}
                {action === 'approve' && (
                  <p className="muted small" style={{ margin: 0 }}>
                    Creates the vendor account and emails a link to set a password.
                  </p>
                )}
                <div className="row">
                  <button
                    type="button"
                    className={`btn ${action === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                    disabled={busy}
                    onClick={() => void send()}
                  >
                    {busy ? 'Sending…' : action === 'approve' ? 'Approve' : action === 'ask' ? 'Send question' : 'Send rejection'}
                  </button>
                  <button type="button" className="btn" onClick={() => setAction(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {data.questions.length > 0 && (
            <section className="card" aria-labelledby="q-title">
              <h2 id="q-title">Questions</h2>
              <ul className="list-plain">
                {data.questions.map((q) => (
                  <li key={q.id}>
                    <strong>Q:</strong> {q.question}
                    <div className="muted small">{formatDate(q.asked_at)}</div>
                    {q.answer ? (
                      <div style={{ marginTop: 6 }}>
                        <strong>A:</strong> {q.answer}
                        <div className="muted small">{formatDate(q.answered_at)}</div>
                      </div>
                    ) : (
                      <div className="muted small">No answer yet</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card" aria-labelledby="h-title">
            <h2 id="h-title">History</h2>
            <ol className="timeline">
              {data.events.map((e, i) => (
                <li key={i}>
                  <strong>
                    {e.to_status ? APPLICATION_STATUS[e.to_status]?.label ?? e.to_status : e.reason}
                  </strong>
                  <div className="muted small">
                    {formatDate(e.created_at)} · {e.actor}
                  </div>
                  {e.to_status && e.reason && <div className="small">{e.reason}</div>}
                  {e.message && <div className="small" style={{ whiteSpace: 'pre-line' }}>“{e.message}”</div>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
