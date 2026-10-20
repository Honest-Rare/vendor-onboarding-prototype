'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, ErrorBox, Loading, StatusBadge } from '@/components/ui';
import { useLoad, waitingSince } from '@/lib/api';
import { AI_RECOMMENDATION, APPLICATION_STATUS, CATEGORY_LABELS } from '@/lib/labels';

type Item = {
  id: string;
  status: string;
  shop_name: string;
  legal_name: string;
  country: string;
  categories: string[];
  created_at: string;
  submitted_at: string | null;
  decided_at: string | null;
  ai_status: string | null;
  ai_recommendation: string | null;
  ai_confidence: number | null;
  rule_fails: number;
};

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'decided', label: 'Decided' },
  { value: 'all', label: 'All' },
];

export default function QueuePage() {
  const [filter, setFilter] = useState('open');
  const [ai, setAi] = useState('');
  const { data, error } = useLoad<{ items: Item[]; counts: Record<string, number> }>(
    `/admin/applications?filter=${filter}`,
    '/admin/login',
    (d) => d.items.some((i) => i.status === 'submitted'),
  );

  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const items = data.items.filter((i) => !ai || i.ai_recommendation === ai);
  const open = (data.counts.submitted ?? 0) + (data.counts.in_review ?? 0) + (data.counts.needs_info ?? 0);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>Applications</h1>
          <p className="muted">
            {open} open. Oldest first. A person decides every application; the AI only prepares the review.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="row" role="group" aria-label="Status filter">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`btn btn-small ${filter === f.value ? 'btn-primary' : ''}`}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="row small" htmlFor="ai-filter">
          AI suggestion
          <select id="ai-filter" value={ai} onChange={(e) => setAi(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Any</option>
            {Object.entries(AI_RECOMMENDATION).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Shop</th>
              <th scope="col">Sells</th>
              <th scope="col">Status</th>
              <th scope="col">Rules</th>
              <th scope="col">AI suggestion</th>
              <th scope="col">Waiting</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nothing here.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/admin/applications/${item.id}`}>
                    <strong>{item.shop_name}</strong>
                  </Link>
                  <div className="muted small">
                    {item.legal_name} · {item.country}
                  </div>
                </td>
                <td>{item.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}</td>
                <td>
                  <StatusBadge map={APPLICATION_STATUS} value={item.status} />
                </td>
                <td>
                  {item.ai_status === 'pending' || item.status === 'submitted' ? (
                    <span className="muted small">Running…</span>
                  ) : item.rule_fails > 0 ? (
                    <Badge tone="bad">{item.rule_fails} to check</Badge>
                  ) : (
                    <Badge tone="good">All pass</Badge>
                  )}
                </td>
                <td>
                  {item.ai_recommendation ? (
                    <span className="row" style={{ gap: 6 }}>
                      <StatusBadge map={AI_RECOMMENDATION} value={item.ai_recommendation} />
                      {item.ai_confidence !== null && <span className="muted small">{Math.round(item.ai_confidence * 100)}%</span>}
                    </span>
                  ) : (
                    <span className="muted small">{item.ai_status === 'failed' ? 'Failed' : 'Not screened yet'}</span>
                  )}
                </td>
                <td className="small">{item.decided_at ? 'Decided' : waitingSince(item.submitted_at ?? item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
