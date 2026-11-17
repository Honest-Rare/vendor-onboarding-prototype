'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field } from '@/components/ui';
import { ApiError, fileUrl } from '@/lib/api';
import { PRODUCT_STATUS, productCounts, productSummary, type Product } from '@/lib/vendor-panel';

function nextStep(p: Product, live: boolean): { next: string; action: string } {
  switch (p.status) {
    case 'in_review':
      return { next: 'Usually within [X] working days', action: 'View' };
    case 'returned':
      return { next: p.note ?? 'Returned with a note', action: 'Fix and resend' };
    case 'draft':
      return { next: p.photos.length === 0 ? 'Not sent yet. Add photos to send for review' : 'Not sent yet', action: 'Continue' };
    case 'approved':
      return { next: live ? 'Visible in your shop' : 'Goes live with your shop', action: 'View' };
    case 'live':
      return { next: 'Visible in your shop', action: 'View' };
  }
}

export default function VendorProductsPage() {
  const { panel, save } = useVendorPanel();
  const counts = productCounts(panel);
  const live = panel.stage === 'live';

  const [platform, setPlatform] = useState<'shopify' | 'shopware'>('shopify');
  const [address, setAddress] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const runImport = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setImported(null);
    try {
      const res = await save<{ imported: number }>('/vendor/products/import', { platform, address, key }, 'POST');
      setImported(res.imported);
      setKey('');
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(String(err), 0));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vendor-page" style={{ maxWidth: 920, gap: 16 }}>
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1>Products</h1>
          <p className="lead" style={{ marginTop: 6 }}>
            Add as many as you like{live ? '' : ' before launch'}. Each product is reviewed on its own.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <a href="#import" className="btn" style={{ fontWeight: 400, fontSize: 14 }}>
            Import from Shopify or Shopware
          </a>
          <Link href="/vendor/products/new" className="btn btn-primary" style={{ fontSize: 14 }}>
            Add product
          </Link>
        </div>
      </div>

      {!live && (
        <section aria-label="Go-live requirement" className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            To go live you need at least one approved product · {counts.approved} approved so far
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
            Approved products go live with your shop. Products approved later appear straight away, with no second go-live step.
          </div>
        </section>
      )}

      <section className="card" style={{ padding: '8px 20px 20px' }}>
        {panel.products.length === 0 ? (
          <p className="muted" style={{ margin: '12px 0 0' }}>
            No products yet. Add your first product, or import from your own shop.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 620, fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ paddingLeft: 8 }}>
                    Product
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">What happens next</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {panel.products.map((p) => {
                  const status = PRODUCT_STATUS[p.status];
                  const { next, action } = nextStep(p, live);
                  return (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: 8 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {p.photos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fileUrl(p.photos[0])} alt="" className="thumb" />
                          ) : (
                            <div className="thumb" aria-hidden="true" />
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name || 'Untitled product'}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {productSummary(p)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${status.tone}`}>{status.label}</span>
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>
                        {next}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/vendor/products/${p.id}`}
                          style={{ fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', minHeight: 44, whiteSpace: 'nowrap' }}
                        >
                          {action}
                          <span className="visually-hidden">: {p.name || 'Untitled product'}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="import" className="card stack" style={{ gap: 12 }}>
        <h2 style={{ margin: 0 }}>
          Import products from your own shop{' '}
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
            (optional)
          </span>
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          Connect your Shopify or Shopware shop to bring in names, descriptions, photos and prices. Imported products arrive as drafts, so
          you can add the food and drinks information before sending them for review.
        </p>
        <form onSubmit={runImport} className="stack" style={{ gap: 12 }}>
          <ErrorBox error={error} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 }}>
            <Field label="Platform" htmlFor="import-platform" required>
              <select id="import-platform" value={platform} onChange={(e) => setPlatform(e.target.value as 'shopify' | 'shopware')}>
                <option value="shopify">Shopify</option>
                <option value="shopware">Shopware</option>
              </select>
            </Field>
            <Field label="Shop address" htmlFor="import-address" required>
              <input
                id="import-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={platform === 'shopify' ? '[your-shop].myshopify.com' : '[your-shop address]'}
              />
            </Field>
            <Field label="Access key" htmlFor="import-key" required>
              <input id="import-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="[API key]" />
            </Field>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Importing…' : 'Connect and import'}
            </button>
            {imported !== null && (
              <span role="status" className="small" style={{ color: 'var(--good-ink)' }}>
                Imported {imported} {imported === 1 ? 'product' : 'products'} as {imported === 1 ? 'a draft' : 'drafts'}.
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
