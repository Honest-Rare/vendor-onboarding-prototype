'use client';

import Link from 'next/link';
import { Badge, ErrorBox, Loading, StatusBadge } from '@/components/ui';
import { formatDate, useLoad } from '@/lib/api';
import { VENDOR_STATUS } from '@/lib/labels';

type Row = { id: string; shop_name: string; status: string; created_at: string; live_at: string | null; waiting: number; approved: number; total: number };

export default function VendorsPage() {
  const { data, error } = useLoad<Row[]>('/admin/vendors', '/admin/login');
  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  return (
    <div className="stack">
      <div>
        <h1>Vendor checks</h1>
        <p className="muted">Approved vendors setting up their shop. Each section needs a final admin check before going live.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Shop</th>
              <th scope="col">Status</th>
              <th scope="col">Sections approved</th>
              <th scope="col">Waiting for you</th>
              <th scope="col">Approved on</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No approved vendors yet. Approve an application first.
                </td>
              </tr>
            )}
            {data.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/admin/vendors/${v.id}`}>
                    <strong>{v.shop_name}</strong>
                  </Link>
                </td>
                <td>
                  <StatusBadge map={VENDOR_STATUS} value={v.status} />
                </td>
                <td>
                  {v.approved} of {v.total}
                </td>
                <td>{v.waiting > 0 ? <Badge tone="info">{v.waiting} to check</Badge> : <span className="muted">None</span>}</td>
                <td className="small">{formatDate(v.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
