'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field } from '@/components/ui';
import { ApiError, fileUrl, formatDate, uploadFile } from '@/lib/api';
import { PRODUCT_CATEGORIES, type Product, type VendorPanel } from '@/lib/vendor-panel';
import s from '../../shop/shop.module.css';

type Draft = Omit<Product, 'id' | 'status' | 'sentAt' | 'note'>;

const EMPTY: Draft = {
  name: '',
  category: 'spirits',
  brand: '',
  description: '',
  photos: [],
  price: '',
  vatRate: '19',
  stock: '',
  weightAndSize: '',
  dimensions: '',
  legalName: '',
  netQuantity: '',
  abv: '',
  minAge: 'none',
  countryOfOrigin: '',
  storage: '',
  bottler: '',
  bestBefore: '',
  ageWarning: '',
  allergens: '',
  deposit: false,
  organicClaim: false,
  containsAlcohol: false,
  attributes: {},
  safety: { manufacturer: '', identifier: '', warnings: '', care: '' },
};

function toDraft(p: Product): Draft {
  const { id: _id, status: _status, sentAt: _sentAt, note: _note, ...rest } = p;
  return structuredClone(rest);
}

const toError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(String(e), 0));

/** "€ 68.00 / l" from "34.00" and "0.5 l". Null when either value doesn't parse. */
function basePrice(price: string, quantity: string): string | null {
  const amount = Number(price.replace(/[€\s]/g, '').replace(',', '.'));
  const m = quantity.trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(ml|cl|l|g|kg)$/i);
  if (!amount || !m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const factor: Record<string, [number, string]> = { ml: [0.001, 'l'], cl: [0.01, 'l'], l: [1, 'l'], g: [0.001, 'kg'], kg: [1, 'kg'] };
  const [f, base] = factor[unit];
  const size = n * f;
  if (!size) return null;
  return `€ ${(amount / size).toFixed(2)} / ${base}`;
}

const humanise = (key: string) => key.replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function VendorProductPage() {
  const { id } = useParams<{ id: string }>();
  const { panel } = useVendorPanel();
  const isNew = id === 'new';
  const product = isNew ? null : panel.products.find((p) => p.id === id);

  if (!isNew && !product) {
    return (
      <div className="vendor-page" style={{ maxWidth: 860 }}>
        <Link href="/vendor/products" style={{ fontSize: 14, textDecoration: 'none' }}>
          ← All products
        </Link>
        <p>We couldn&apos;t find this product.</p>
      </div>
    );
  }
  return <ProductForm key={id} panel={panel} product={product ?? null} />;
}

function ProductForm({ panel, product }: { panel: VendorPanel; product: Product | null }) {
  const router = useRouter();
  const { save } = useVendorPanel();
  const [form, setForm] = useState<Draft>(() => (product ? toDraft(product) : structuredClone(EMPTY)));
  const [busy, setBusy] = useState<'save' | 'send' | 'photo' | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  /** Set once a new product exists, so a failed send doesn't create it twice. */
  const createdId = useRef<string | null>(null);

  const fieldErrors = new Map((error?.errors ?? []).map((e) => [e.path, e.message]));
  const invalid = (path: string) => (fieldErrors.has(path) ? { 'aria-invalid': true as const, 'aria-describedby': 'product-errors' } : {});

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  };
  const text = (key: { [K in keyof Draft]: Draft[K] extends string ? K : never }[keyof Draft]) => ({
    value: form[key] as string,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, e.target.value as never),
    ...invalid(key),
  });
  const safety = (key: keyof Draft['safety']) => ({
    value: form.safety[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update('safety', { ...form.safety, [key]: e.target.value }),
  });

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setBusy('photo');
    setError(null);
    try {
      const ids: string[] = [];
      for (const f of files) ids.push((await uploadFile('/vendor/uploads', f)).id);
      update('photos', [...form.photos, ...ids]);
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(null);
    }
  };

  const submit = async (send: boolean) => {
    setBusy(send ? 'send' : 'save');
    setError(null);
    setMessage(null);
    let id = product?.id ?? createdId.current;
    try {
      if (!id) {
        // A new product is created as a draft first; sending then goes through the same route as an existing one.
        id = (await save<Product>('/vendor/products', form, 'POST')).id;
        createdId.current = id;
      }
      if (product || send) await save(`/vendor/products/${id}`, { product: form, send });
      if (!product) {
        router.replace(`/vendor/products/${id}`);
        return;
      }
      setMessage(send ? 'Sent for review' : 'Saved');
    } catch (err) {
      setError(toError(err));
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setBusy(null);
    }
  };

  const alcoholic = ['spirits', 'liqueur', 'beer', 'wine'].includes(form.category) || form.containsAlcohol;
  const base = basePrice(form.price, form.netQuantity);
  const attrKeys = Object.keys(form.attributes);
  const categoryWord = PRODUCT_CATEGORIES[form.category].toLowerCase();

  return (
    <div className="vendor-page" style={{ maxWidth: 860, gap: 16 }}>
      <div ref={topRef} style={{ scrollMarginTop: 16 }}>
        <Link href="/vendor/products" style={{ fontSize: 14, textDecoration: 'none' }}>
          ← All products
        </Link>
        <h1 style={{ marginTop: 8 }}>{product ? product.name || 'Untitled product' : 'New product'}</h1>
      </div>

      {product && <StatusBanner product={product} live={panel.stage === 'live'} />}

      <form
        className="stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit(true);
        }}
      >
        {error && (
          <div id="product-errors">
            <ErrorBox error={error} />
          </div>
        )}

        <Section title="Basics">
          <div style={grid(240)}>
            <Field label="Product name" htmlFor="p-name" required>
              <input id="p-name" type="text" {...text('name')} />
            </Field>
            <Field label="Category" htmlFor="p-category" required>
              <select id="p-category" value={form.category} onChange={(e) => update('category', e.target.value as Product['category'])}>
                {Object.entries(PRODUCT_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand (Hersteller), if not your shop name" htmlFor="p-brand" required>
              <input id="p-brand" type="text" placeholder="[Brand]" {...text('brand')} />
            </Field>
          </div>
          <Field label="Description (German and English)" htmlFor="p-desc" required>
            <textarea id="p-desc" rows={3} placeholder="[Description]" {...text('description')} />
          </Field>
          <div className="row" style={{ gap: 10 }} {...(fieldErrors.has('photos') ? { 'aria-describedby': 'product-errors' } : {})}>
            {form.photos.map((photo, i) => (
              <div key={photo} style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(photo)} alt={`Photo ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, display: 'block', background: '#efede7' }} />
                <button
                  type="button"
                  className="btn btn-small"
                  aria-label={`Remove photo ${i + 1}`}
                  style={{ position: 'absolute', top: 2, right: 2, padding: '0 10px' }}
                  onClick={() => update('photos', form.photos.filter((x) => x !== photo))}
                >
                  ×
                </button>
              </div>
            ))}
            <label className={`${s.upload} ${s.uploadDashed}`} aria-disabled={busy === 'photo'} style={{ width: 80, height: 80, borderRadius: 8 }}>
              <input type="file" accept="image/*" multiple className="visually-hidden" onChange={(e) => void addPhotos(e)} disabled={busy === 'photo'} />
              {busy === 'photo' ? 'Uploading…' : 'Add photo'}
            </label>
            <span className="muted" style={{ fontSize: 12 }}>
              At least [N] photos, [W × H] px or larger
            </span>
          </div>
        </Section>

        <Section title="Price and stock">
          <div style={grid(180)}>
            <Field label="Price incl. VAT" htmlFor="p-price" required>
              <input id="p-price" type="text" inputMode="decimal" placeholder="€ [price]" {...text('price')} />
            </Field>
            <Field label="VAT rate" htmlFor="p-vat" required>
              <select id="p-vat" value={form.vatRate} onChange={(e) => update('vatRate', e.target.value as Draft['vatRate'])}>
                <option value="19">19%</option>
                <option value="7">7%</option>
              </select>
            </Field>
            <Field label="Stock" htmlFor="p-stock" required>
              <input id="p-stock" type="text" inputMode="numeric" placeholder="[quantity]" {...text('stock')} />
            </Field>
            <Field label="Weight and package size" htmlFor="p-weight" required>
              <input id="p-weight" type="text" placeholder="[weight], [size]" {...text('weightAndSize')} />
            </Field>
            <Field label="Length × width × height" htmlFor="p-dims">
              <input id="p-dims" type="text" placeholder="[L × W × H] cm" {...text('dimensions')} />
            </Field>
          </div>
          <div className="muted" style={{ fontSize: 13 }} aria-live="polite">
            Base price, shown to customers by law: <strong style={{ color: 'var(--ink)' }}>{base ?? '€ [amount] / l'}</strong> · calculated from
            price and net quantity
          </div>
        </Section>

        <Section title="Food and drinks information" sub="Shown to customers before they buy, as EU food law requires. Fields depend on the category.">
          <div style={grid(200)}>
            <Field label="Legal product name" htmlFor="p-legal" required>
              <input id="p-legal" type="text" {...text('legalName')} />
            </Field>
            <Field label="Net quantity" htmlFor="p-qty" required>
              <input id="p-qty" type="text" placeholder="0.5 l" {...text('netQuantity')} />
            </Field>
            {alcoholic && (
              <Field label="Alcohol by volume (% vol)" htmlFor="p-abv" required>
                <input id="p-abv" type="text" inputMode="decimal" placeholder="[%]" {...text('abv')} />
              </Field>
            )}
            {alcoholic && (
              <Field label="Minimum age" htmlFor="p-age" required>
                <select id="p-age" value={form.minAge} onChange={(e) => update('minAge', e.target.value as Draft['minAge'])}>
                  <option value="18">18+</option>
                  <option value="16">16+</option>
                  <option value="none">No minimum age</option>
                </select>
              </Field>
            )}
            <Field label="Country of origin" htmlFor="p-origin" required>
              <input id="p-origin" type="text" placeholder="Germany" {...text('countryOfOrigin')} />
            </Field>
            <Field label="Storage conditions" htmlFor="p-storage" required>
              <input id="p-storage" type="text" placeholder="[if relevant]" {...text('storage')} />
            </Field>
            <Field label="Bottler (Abfüller), if it applies" htmlFor="p-bottler" required>
              <input id="p-bottler" type="text" placeholder="[Name and address]" {...text('bottler')} />
            </Field>
            <Field label="Best-before date, if relevant" htmlFor="p-bbd" required>
              <input id="p-bbd" type="text" placeholder="[DD.MM.YYYY]" {...text('bestBefore')} />
            </Field>
          </div>
          {alcoholic && (
            <Field label="Age warning text (alcohol)" htmlFor="p-warning" required>
              <input id="p-warning" type="text" placeholder="[e.g. No sale to persons under 18]" {...text('ageWarning')} />
            </Field>
          )}
          <Field
            label="Allergens"
            htmlFor="p-allergens"
            required
            hint="Allergens are always entered by you, never generated by AI. Spirits don't need an ingredients list or nutrition table."
          >
            <input id="p-allergens" type="text" placeholder="[Allergens, entered by you]" {...text('allergens')} />
          </Field>
          <div className="row" style={{ gap: 20, fontSize: 14 }}>
            <Check label="Single-use deposit (Pfand)" checked={form.deposit} onChange={(v) => update('deposit', v)} />
            <Check label="Organic claim (needs certificate)" checked={form.organicClaim} onChange={(v) => update('organicClaim', v)} />
            <Check label="Contains alcohol (food with added alcohol)" checked={form.containsAlcohol} onChange={(v) => update('containsAlcohol', v)} />
          </div>
        </Section>

        <Section
          title="Attributes"
          titleNote="(optional, used for shop filters)"
          sub="The fields depend on the category, for example beer style, roast level or grape variety."
        >
          <div style={grid(200)}>
            {attrKeys.map((k) => (
              <Field key={k} label={humanise(k)} htmlFor={`p-attr-${k}`} required>
                <input
                  id={`p-attr-${k}`}
                  type="text"
                  value={form.attributes[k]}
                  onChange={(e) => update('attributes', { ...form.attributes, [k]: e.target.value })}
                />
              </Field>
            ))}
            {attrKeys.length === 0 &&
              [1, 2].map((n) => (
                <Field key={n} label={`[Attribute for ${categoryWord}]`} htmlFor={`p-attr-${n}`} required>
                  <select id={`p-attr-${n}`} defaultValue="">
                    <option value="">[Choose]</option>
                  </select>
                </Field>
              ))}
          </div>
        </Section>

        <Section dashed title="Product safety" titleNote="(non-food items only, such as glassware and gift sets)">
          <div style={grid(240)}>
            <Field label="Manufacturer name and address" htmlFor="p-manufacturer" required>
              <input id="p-manufacturer" type="text" placeholder="[EU responsible person if made outside the EU]" {...safety('manufacturer')} />
            </Field>
            <Field label="Product identifier" htmlFor="p-identifier" required>
              <input id="p-identifier" type="text" placeholder="[Batch, model or type]" {...safety('identifier')} />
            </Field>
          </div>
          <Field label="Safety warnings and instructions" htmlFor="p-warnings" required>
            <textarea id="p-warnings" rows={2} placeholder="[Where relevant]" style={{ minHeight: 70 }} {...safety('warnings')} />
          </Field>
          <Field label="Material and care instructions" htmlFor="p-care" required>
            <textarea id="p-care" rows={2} placeholder="[Where relevant]" style={{ minHeight: 70 }} {...safety('care')} />
          </Field>
        </Section>

        <div
          className="card spread"
          style={{ position: 'sticky', bottom: 0, padding: '16px 20px', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 1 }}
        >
          <span className="muted" style={{ fontSize: 12, flex: '1 1 260px', lineHeight: 1.5 }}>
            {message ? (
              <strong role="status" style={{ color: 'var(--good-ink)', fontSize: 14 }}>
                {message}
              </strong>
            ) : (
              'Drafts are only visible to you. Sending changes to a product that is in review puts it back in the review queue.'
            )}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" style={{ fontWeight: 400 }} disabled={busy !== null} onClick={() => void submit(false)}>
              {busy === 'save' ? 'Saving…' : 'Save draft'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy !== null}>
              {busy === 'send' ? 'Sending…' : 'Send for review'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StatusBanner({ product, live }: { product: Product; live: boolean }) {
  const banner: Record<Product['status'], { border: string; ink: string; title: string; body: ReactNode }> = {
    in_review: {
      border: 'var(--warn-line)',
      ink: 'var(--warn-ink)',
      title: `In review · sent ${formatDate(product.sentAt)}`,
      body: 'Honest & Rare checks every product before it shows. You need at least one approved product to go live. If something is missing, it comes back to you with a note.',
    },
    returned: {
      border: '#e9b4ac',
      ink: 'var(--bad-ink)',
      title: 'Returned · note from Honest & Rare',
      body: (
        <>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{product.note ?? 'Please check the details.'}</span> Fix the details below and
          send it for review again.
        </>
      ),
    },
    draft: {
      border: 'var(--line)',
      ink: 'var(--muted)',
      title: 'Draft · only visible to you',
      body: 'Send it for review when the details are complete. Honest & Rare checks every product before it shows.',
    },
    approved: {
      border: '#b5d9c2',
      ink: 'var(--good-ink)',
      title: 'Approved',
      body: live ? 'Customers can see this product in your shop.' : 'This product goes live with your shop.',
    },
    live: {
      border: '#b5d9c2',
      ink: 'var(--good-ink)',
      title: 'Live · visible in your shop',
      body: 'Sending changes puts the product back in the review queue. Customers see the current version until the change is approved.',
    },
  };
  const b = banner[product.status];
  return (
    <section aria-label="Review status" className="card" style={{ borderColor: b.border, padding: '16px 20px' }}>
      <div className="eyebrow" style={{ color: b.ink }}>
        {b.title}
      </div>
      <div className="muted" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
        {b.body}
      </div>
    </section>
  );
}

function grid(min: number) {
  return { display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 12 } as const;
}

function Section({
  title,
  titleNote,
  sub,
  dashed,
  children,
}: {
  title: string;
  titleNote?: string;
  sub?: string;
  dashed?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="card stack"
      style={{ gap: 12, ...(dashed ? { borderStyle: 'dashed', borderColor: '#b9c2bd' } : {}) }}
    >
      <h2 style={{ margin: 0 }}>
        {title}
        {titleNote && (
          <>
            {' '}
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
              {titleNote}
            </span>
          </>
        )}
      </h2>
      {sub && (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {sub}
        </p>
      )}
      {children}
    </section>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
      {label}
    </label>
  );
}
