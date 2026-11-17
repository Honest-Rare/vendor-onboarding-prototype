'use client';

import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field } from '@/components/ui';
import { api, ApiError, fileUrl, uploadFile } from '@/lib/api';
import { shopSections, shopSectionsDone, type VendorPanel } from '@/lib/vendor-panel';
import s from './shop.module.css';

type Shop = VendorPanel['shop'];
type TextKey = 'storyDe' | 'storyEn' | 'town' | 'links' | 'seoTitle' | 'seoDescription' | 'analyticsId' | 'pixelId';
type ImageKey = 'logo' | 'banner' | 'emailLogo' | 'favicon';

const TEXT_KEYS: TextKey[] = ['storyDe', 'storyEn', 'town', 'links', 'seoTitle', 'seoDescription', 'analyticsId', 'pixelId'];

function pickText(shop: Shop): Record<TextKey, string> {
  return Object.fromEntries(TEXT_KEYS.map((k) => [k, shop[k]])) as Record<TextKey, string>;
}

const toError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(String(e), 0));

export default function VendorShopPage() {
  const { panel, save } = useVendorPanel();
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState(() => pickText(panel.shop));
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);

  // "View your shop" on the live overview links here with #preview.
  useEffect(() => {
    if (window.location.hash === '#preview') setPreview(true);
  }, []);

  const sections = shopSections(panel);
  const done = shopSectionsDone(panel);
  const dirty = TEXT_KEYS.some((k) => form[k] !== panel.shop[k]);
  const set = (k: TextKey) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy(null);
    }
  };

  const saveText = () =>
    run('save', async () => {
      await save('/vendor/shop', form);
      setSaved(true);
      setDraftNote(null);
    });

  const uploadImage = (key: ImageKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void run(key, async () => {
      const up = await uploadFile('/vendor/uploads', file);
      await save('/vendor/shop', { [key]: up.id });
    });
  };

  const uploadWorkshop = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    void run('workshop', async () => {
      const ids: string[] = [];
      for (const f of files) ids.push((await uploadFile('/vendor/uploads', f)).id);
      await save('/vendor/shop', { workshopPhotos: [...panel.shop.workshopPhotos, ...ids] });
    });
  };

  const draft = (kind: 'story_en' | 'meta_description') =>
    run(kind, async () => {
      const { text } = await api<{ text: string }>('/vendor/shop/draft', { json: { kind } });
      if (kind === 'story_en') {
        setForm((f) => ({ ...f, storyEn: text }));
        setLang('en');
        setDraftNote('AI draft added to the English field. Check and edit it, then save your changes.');
      } else {
        setForm((f) => ({ ...f, seoDescription: text }));
        setDraftNote('AI draft added to the meta description. Check and edit it, then save your changes.');
      }
      setSaved(false);
    });

  const storyChip = sections.storyDe && sections.storyEn ? <Chip done>✓ Done</Chip> : sections.storyDe ? <Chip>English missing</Chip> : <Chip>German missing</Chip>;
  // The first unfinished section gets the focus border, as in the design.
  const focus = !sections.logoAndBanner ? 1 : !(sections.storyDe && sections.storyEn) ? 2 : !sections.location ? 3 : 0;

  return (
    <div className="vendor-page" style={{ maxWidth: 720, gap: 16 }}>
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1>Shop page</h1>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
            {done} of 4 sections done · {dirty ? 'unsaved changes' : 'all changes saved'}
          </p>
        </div>
        <div role="tablist" aria-label="Mode" className={s.segmented}>
          <button type="button" role="tab" aria-selected={!preview} onClick={() => setPreview(false)}>
            Edit
          </button>
          <button type="button" role="tab" aria-selected={preview} onClick={() => setPreview(true)}>
            Preview
          </button>
        </div>
      </div>

      {preview ? (
        <ShopPreview panel={panel} onBack={() => setPreview(false)} />
      ) : (
        <div className="stack">
          <ErrorBox error={error} />

          <section className={`card ${s.section} ${focus === 1 ? 'card-focus' : ''}`}>
            <SectionHead title="1 · Logo and banner" chip={sections.logoAndBanner ? <Chip done>✓ Done</Chip> : <Chip>To do</Chip>} />
            <div className="row" style={{ gap: 16 }}>
              <UploadTile
                label={panel.shop.logo ? 'Change logo' : 'Add logo'}
                image={panel.shop.logo}
                busy={busy === 'logo'}
                onChange={uploadImage('logo')}
                style={{ width: 88, height: 88, borderRadius: 44, background: '#efede7' }}
              />
              <UploadTile
                label={panel.shop.banner ? 'Change banner' : 'Add banner'}
                image={panel.shop.banner}
                busy={busy === 'banner'}
                onChange={uploadImage('banner')}
                style={{ flex: '1 1 200px', height: 88, borderRadius: 8, background: '#e7e4dc' }}
              />
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              Logo at least [W × H] px, banner at least [W × H] px. We check image size and that photos are your own.
            </span>
            {panel.shop.workshopPhotos.length > 0 && (
              <div className="row" style={{ gap: 8 }}>
                {panel.shop.workshopPhotos.map((id, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={id} src={fileUrl(id)} alt={`Workshop photo ${i + 1}`} className="thumb" style={{ width: 64, height: 64 }} />
                ))}
              </div>
            )}
            <label className={`btn btn-small ${s.upload}`} style={{ alignSelf: 'flex-start', fontWeight: 400, fontSize: 13 }} aria-disabled={busy === 'workshop'}>
              <input type="file" accept="image/*" multiple className="visually-hidden" onChange={uploadWorkshop} disabled={busy === 'workshop'} />
              {busy === 'workshop' ? 'Uploading…' : 'Add workshop photos (optional)'}
            </label>
          </section>

          <section className={`card ${s.section} ${focus === 2 ? 'card-focus' : ''}`}>
            <SectionHead title="2 · Your story" chip={storyChip} />
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Who makes it, how and where. We started with the story from your application.
            </p>
            <div role="tablist" aria-label="Language" className={s.segmented}>
              <button type="button" role="tab" aria-selected={lang === 'de'} aria-controls="story" onClick={() => setLang('de')}>
                Deutsch{form.storyDe.trim() ? ' ✓' : ''}
              </button>
              <button type="button" role="tab" aria-selected={lang === 'en'} aria-controls="story" onClick={() => setLang('en')}>
                English{form.storyEn.trim() ? ' ✓' : ''}
              </button>
            </div>
            <Field label={lang === 'de' ? 'Your story (German)' : 'Your story (English)'} htmlFor="story" required>
              <textarea
                id="story"
                rows={7}
                lang={lang}
                value={lang === 'de' ? form.storyDe : form.storyEn}
                onChange={set(lang === 'de' ? 'storyDe' : 'storyEn')}
                style={{ fontSize: 15, lineHeight: 1.6 }}
              />
            </Field>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-small" style={{ fontWeight: 400, fontSize: 13 }} disabled={busy === 'story_en' || !form.storyDe.trim()} onClick={() => void draft('story_en')}>
                {busy === 'story_en' ? 'Drafting…' : 'Draft English version with AI'}
              </button>
              <span className="muted" style={{ fontSize: 12 }}>
                You review every AI draft before it&apos;s used.
              </span>
            </div>
          </section>

          <section className={`card ${s.section} ${focus === 3 ? 'card-focus' : ''}`}>
            <SectionHead title="3 · Location and links" chip={sections.location ? <Chip done>✓ Done</Chip> : <Chip>To do</Chip>} />
            <Field label="Town and region" htmlFor="town" required>
              <input id="town" type="text" value={form.town} onChange={set('town')} placeholder="[Town], [Region]" />
            </Field>
            <Field label="Website and social links" htmlFor="social">
              <input id="social" type="text" value={form.links} onChange={set('links')} placeholder="[https://…]" />
            </Field>
          </section>

          <section className={`card ${s.section}`} style={{ gap: 6 }}>
            <SectionHead title="4 · Legal notice and policies" chip={<Chip done>✓ Automatic</Chip>} />
            <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              <li>Legal notice (Impressum): from your business and legal data</li>
              <li>Terms, right of withdrawal, privacy notice: our templates, with the exception for perishable food</li>
              <li>Shipping and returns policy: from your shipping settings</li>
            </ul>
            <div className="row" style={{ gap: 16 }}>
              <Link href="/vendor/legal" style={{ fontSize: 14 }}>
                Edit in Legal and tax
              </Link>
              <Link href="/vendor/shipping" style={{ fontSize: 14 }}>
                Edit in Shipping
              </Link>
            </div>
          </section>

          <h2 className="muted" style={{ margin: '12px 0 0', fontSize: 15 }}>
            Optional
          </h2>

          <section className={`card ${s.section}`}>
            <h2>Email logo and favicon</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Shown in order emails to your customers and in the browser tab. We check the image size.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <UploadTile
                label={panel.shop.emailLogo ? 'Change email logo' : 'Upload email logo · [W × H] px'}
                image={panel.shop.emailLogo}
                busy={busy === 'emailLogo'}
                onChange={uploadImage('emailLogo')}
                dashed
                style={{ flex: '1 1 200px', height: 72, borderRadius: 8 }}
              />
              <UploadTile
                label="Favicon"
                image={panel.shop.favicon}
                busy={busy === 'favicon'}
                onChange={uploadImage('favicon')}
                dashed
                style={{ width: 72, height: 72, borderRadius: 8 }}
              />
            </div>
          </section>

          <section className={`card ${s.section}`}>
            <h2>Search engines</h2>
            <Field label="Page title" htmlFor="seo-title" required>
              <input id="seo-title" type="text" value={form.seoTitle} onChange={set('seoTitle')} placeholder="[Shop name] · [what you make] from [Region]" />
            </Field>
            <Field label="Meta description" htmlFor="seo-desc" required>
              <textarea id="seo-desc" rows={3} value={form.seoDescription} onChange={set('seoDescription')} placeholder="[One or two sentences shown in search results]" />
            </Field>
            <button
              type="button"
              className="btn btn-small"
              style={{ alignSelf: 'flex-start', fontWeight: 400, fontSize: 13 }}
              disabled={busy === 'meta_description'}
              onClick={() => void draft('meta_description')}
            >
              {busy === 'meta_description' ? 'Drafting…' : 'Draft from my story with AI'}
            </button>
          </section>

          <section className={`card ${s.section}`}>
            <h2>Tracking codes</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Measure visits to your shop page with your own tools.
            </p>
            <Field label="Google Analytics ID" htmlFor="ga" required>
              <input id="ga" type="text" value={form.analyticsId} onChange={set('analyticsId')} placeholder="G-…" />
            </Field>
            <Field label="Facebook pixel ID" htmlFor="fb" required>
              <input id="fb" type="text" value={form.pixelId} onChange={set('pixelId')} placeholder="[Pixel ID]" />
            </Field>
          </section>

          <div
            className="card spread"
            style={{ position: 'sticky', bottom: 0, padding: '12px 16px', boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}
          >
            <span role="status" className="muted" style={{ fontSize: 13, flex: '1 1 200px' }}>
              {draftNote ?? (saved && !dirty ? 'Saved' : dirty ? 'You have unsaved changes.' : '')}
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" onClick={() => void saveText()} disabled={busy === 'save' || !dirty}>
                {busy === 'save' ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setPreview(true)}>
                Preview your shop page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ done, children }: { done?: boolean; children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: done ? 'var(--good-ink)' : 'var(--warn-ink)' }}>{children}</span>;
}

function SectionHead({ title, chip }: { title: string; chip: ReactNode }) {
  return (
    <div className="spread" style={{ gap: 8 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {chip}
    </div>
  );
}

function UploadTile({
  label,
  image,
  busy,
  onChange,
  dashed,
  style,
}: {
  label: string;
  image: string | null;
  busy: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  dashed?: boolean;
  style: CSSProperties;
}) {
  return (
    <label
      className={`${s.upload} ${dashed ? s.uploadDashed : ''}`}
      aria-disabled={busy}
      style={{ ...style, ...(image ? { backgroundImage: `url("${fileUrl(image)}")` } : {}) }}
    >
      <input type="file" accept="image/*" className="visually-hidden" onChange={onChange} disabled={busy} />
      <span className={image ? s.uploadLabel : undefined}>{busy ? 'Uploading…' : label}</span>
    </label>
  );
}

function ShopPreview({ panel, onBack }: { panel: VendorPanel; onBack: () => void }) {
  const shop = panel.shop;
  const products = panel.products.filter((p) => p.status === 'approved' || p.status === 'live');
  const live = panel.stage === 'live';

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="badge badge-info" style={{ fontSize: 12 }}>
          {live ? 'Preview' : 'Private preview'}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {live ? 'This is how customers see your shop page.' : 'Only you can see this until your shop goes live.'}
        </span>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {shop.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(shop.banner)} alt="" style={{ display: 'block', width: '100%', height: 200, objectFit: 'cover' }} />
        ) : (
          <div style={{ height: 200, background: '#dcd9d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#4a4f4c' }}>
            Banner
          </div>
        )}
        <div style={{ padding: '0 clamp(16px, 4vw, 28px) 28px' }}>
          <div className="row" style={{ alignItems: 'flex-end', gap: 16, marginTop: -40 }}>
            {shop.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl(shop.logo)}
                alt={`${shop.name} logo`}
                style={{ width: 80, height: 80, borderRadius: 40, objectFit: 'cover', background: '#fff', boxShadow: '0 0 0 1px #d6d3ca' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 40, background: '#fff', boxShadow: '0 0 0 1px #d6d3ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#4a4f4c' }}>
                Logo
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{shop.name}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {shop.town || '[Town], [Region]'}
              </div>
            </div>
          </div>
          <p lang="de" style={{ margin: '20px 0 0', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {shop.storyDe || '[Story from the application]'}
          </p>
          {shop.storyEn && (
            <p lang="en" className="muted" style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {shop.storyEn}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 24 }}>
            {products.slice(0, 3).map((p) =>
              p.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={fileUrl(p.photos[0])} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
              ) : (
                <div key={p.id} style={{ height: 120, background: '#efede7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#4a4f4c', textAlign: 'center', padding: 8 }}>
                  {p.name}
                </div>
              ),
            )}
            {products.length < 3 && (
              <div style={{ height: 120, background: '#f6f5f1', border: '1px dashed #b9c2bd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#4a4f4c', textAlign: 'center', padding: 8 }}>
                Approved products appear here
              </div>
            )}
            {Array.from({ length: Math.max(0, 2 - products.length) }, (_, i) => (
              <div key={i} style={{ height: 120, background: '#f6f5f1', border: '1px dashed #b9c2bd' }} />
            ))}
          </div>
          <div className="muted" style={{ marginTop: 20, fontSize: 12 }}>
            Legal notice · Terms · Right of withdrawal · Privacy
          </div>
        </div>
      </div>
      <button type="button" className="btn" style={{ alignSelf: 'flex-start', fontWeight: 400 }} onClick={onBack}>
        ← Back to editing
      </button>
    </div>
  );
}
