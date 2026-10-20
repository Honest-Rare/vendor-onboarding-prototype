'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StorefrontShell } from '@/components/StorefrontShell';
import { ErrorBox, Field } from '@/components/ui';
import { api, ApiError, uploadFile } from '@/lib/api';
import { BUSINESS_TYPES, CATEGORY_LABELS, MAKES_OWN, PLANS } from '@/lib/labels';

const EU = [
  ['AT', 'Austria'], ['BE', 'Belgium'], ['BG', 'Bulgaria'], ['HR', 'Croatia'], ['CY', 'Cyprus'], ['CZ', 'Czechia'],
  ['DK', 'Denmark'], ['EE', 'Estonia'], ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'],
  ['HU', 'Hungary'], ['IE', 'Ireland'], ['IT', 'Italy'], ['LV', 'Latvia'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'],
  ['MT', 'Malta'], ['NL', 'Netherlands'], ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SK', 'Slovakia'],
  ['SI', 'Slovenia'], ['ES', 'Spain'], ['SE', 'Sweden'],
];
const NON_EU = [['CH', 'Switzerland'], ['GB', 'United Kingdom'], ['NO', 'Norway']];

const STEPS = ['Your business', 'Contact', 'What you sell', 'Plan and agreement'];
const DRAFT_KEY = 'hr-application-draft-v1';

type Photo = { id: string; name: string; preview?: string };

const EMPTY = {
  business: {
    type: '' as string,
    legalName: '',
    shopName: '',
    country: 'DE',
    vatId: '',
    taxNumber: '',
    registerNumber: '',
    registerCourt: '',
    address: { street: '', postcode: '', city: '' },
  },
  contact: { firstName: '', lastName: '', role: '', email: '', phone: '', website: '', socialLinks: '' },
  products: { categories: [] as string[], makesOwnProducts: '' as string, story: '', productCount: '', priceRange: '', whereSoldToday: '' },
  agreement: { plan: '' as string, acceptTerms: false, legalSelfCertification: false, language: 'en' },
};
type Form = typeof EMPTY;

function stepErrors(step: number, f: Form, photos: Photo[]): string[] {
  const e: string[] = [];
  if (step === 0) {
    if (!f.business.type) e.push('Choose your business type.');
    if (!f.business.legalName.trim()) e.push('Enter your legal business name.');
    if (!f.business.shopName.trim()) e.push('Enter your shop name.');
    if (f.business.type === 'small_business') {
      if (!f.business.vatId.trim() && !f.business.taxNumber.trim()) e.push('Enter your VAT ID or tax number.');
    } else if (!f.business.vatId.trim()) e.push('Enter your VAT ID.');
    if (f.business.vatId && !/^[A-Za-z]{2}[\s.\-]*[0-9A-Za-z+*.\s\-]{2,14}$/.test(f.business.vatId.trim())) {
      e.push('A VAT ID starts with a two-letter country code, for example DE123456789.');
    }
    if (f.business.type === 'company' && !f.business.registerNumber.trim()) e.push('Enter your trade register number.');
    const a = f.business.address;
    if (!a.street.trim() || !a.postcode.trim() || !a.city.trim()) e.push('Enter your full business address.');
  }
  if (step === 1) {
    if (!f.contact.firstName.trim() || !f.contact.lastName.trim()) e.push('Enter your first and last name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact.email.trim())) e.push('Enter a valid email address.');
    if (!/^(\+|00)[1-9][\d\s\-()/.]{6,}$/.test(f.contact.phone.trim())) e.push('Enter your phone number with country code, for example +49 30 1234567.');
    if (!f.contact.website.trim() && !f.contact.socialLinks.trim()) e.push('Give your website or at least one social media link.');
  }
  if (step === 2) {
    if (f.products.categories.length === 0) e.push('Choose at least one category.');
    if (!f.products.makesOwnProducts) e.push('Tell us whether you make your products yourself.');
    if (f.products.story.trim().length < 80) e.push('Tell us a bit more about how you make your products (at least 80 characters).');
    if (photos.length < 3 || photos.length > 5) e.push('Add 3 to 5 photos of your products.');
    if (!f.products.productCount.trim() || !f.products.priceRange.trim()) e.push('Give the number of products and your price range.');
  }
  if (step === 3) {
    if (!f.agreement.plan) e.push('Choose a plan.');
    if (!f.agreement.acceptTerms) e.push('Accept the vendor terms and privacy policy.');
    if (!f.agreement.legalSelfCertification) e.push('Confirm that you may legally sell these products.');
  }
  return e;
}

export default function ApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // The draft stays in this browser only. No account exists before approval.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm({ ...EMPTY, ...parsed.form });
        setPhotos(parsed.photos ?? []);
        setStep(parsed.step ?? 0);
      }
    } catch {
      // ignore: start empty
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, step, photos: photos.map(({ id, name }) => ({ id, name })) }),
      );
    } catch {
      // storage unavailable: the form still works
    }
  }, [form, photos, step, loaded]);

  const set = <K extends keyof Form>(section: K, patch: Partial<Form[K]>) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], ...patch } }));

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const next = () => {
    const e = stepErrors(step, form, photos);
    setErrors(e);
    if (e.length === 0) {
      setStep(step + 1);
      setApiError(null);
    }
    scrollTop();
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setApiError(null);
    for (const file of Array.from(files)) {
      if (photos.length >= 5) break;
      try {
        const saved = await uploadFile('/applications/photos', file);
        setPhotos((p) => (p.length >= 5 ? p : [...p, { ...saved, preview: URL.createObjectURL(file) }]));
      } catch (e) {
        setApiError(e as ApiError);
      }
    }
  };

  const submit = async () => {
    const e = stepErrors(3, form, photos);
    setErrors(e);
    if (e.length > 0) return scrollTop();
    setBusy(true);
    setApiError(null);
    try {
      await api('/applications', {
        json: { ...form, products: { ...form.products, photoIds: photos.map((p) => p.id) } },
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/apply/check-email?email=${encodeURIComponent(form.contact.email)}`);
    } catch (err) {
      setApiError(err as ApiError);
      scrollTop();
    } finally {
      setBusy(false);
    }
  };

  const b = form.business;
  const c = form.contact;
  const p = form.products;
  const a = form.agreement;

  return (
    <StorefrontShell>
      <main className="container narrow">
        <div ref={topRef} />
        <h1>Apply to sell on Honest &amp; Rare</h1>
        <p className="muted">
          Four short steps. Your answers are kept in this browser until you send them. Bank and ID details come later,
          only if you are approved.
        </p>

        <ol className="steps" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="num">Step {i + 1} of 4</span>
              {label}
            </li>
          ))}
        </ol>

        <div className="stack">
          {errors.length > 0 && (
            <div className="alert alert-bad" role="alert">
              <strong>Please check:</strong>
              <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <ErrorBox error={apiError} />

          {step === 0 && (
            <div className="card stack">
              <fieldset className="field">
                <legend>Business type</legend>
                <div className="choices">
                  {Object.entries(BUSINESS_TYPES).map(([value, label]) => (
                    <label className="choice" key={value}>
                      <input type="radio" name="btype" checked={b.type === value} onChange={() => set('business', { type: value })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="form-grid">
                <Field label="Legal business name" htmlFor="legalName" required hint="As registered, for example including GmbH">
                  <input id="legalName" type="text" value={b.legalName} onChange={(e) => set('business', { legalName: e.target.value })} />
                </Field>
                <Field label="Shop name" htmlFor="shopName" required hint="The name customers will see">
                  <input id="shopName" type="text" value={b.shopName} onChange={(e) => set('business', { shopName: e.target.value })} />
                </Field>
              </div>
              <Field label="Country of registration" htmlFor="country" required hint="We work with producers registered in the EU.">
                <select id="country" value={b.country} onChange={(e) => set('business', { country: e.target.value })}>
                  <optgroup label="EU">
                    {EU.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </optgroup>
                  <optgroup label="Outside the EU">
                    {NON_EU.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </optgroup>
                </select>
              </Field>
              <div className="form-grid">
                <Field
                  label="VAT ID"
                  htmlFor="vatId"
                  required={b.type !== 'small_business'}
                  hint="Starts with your country code, for example DE123456789"
                >
                  <input id="vatId" type="text" value={b.vatId} onChange={(e) => set('business', { vatId: e.target.value })} />
                </Field>
                {b.type === 'small_business' && (
                  <Field label="Tax number (Steuernummer)" htmlFor="taxNumber" required={!b.vatId} hint="If you have no VAT ID">
                    <input id="taxNumber" type="text" value={b.taxNumber} onChange={(e) => set('business', { taxNumber: e.target.value })} />
                  </Field>
                )}
              </div>
              {b.type === 'company' && (
                <div className="form-grid">
                  <Field label="Trade register number" htmlFor="registerNumber" required hint="For example HRB 123456">
                    <input id="registerNumber" type="text" value={b.registerNumber} onChange={(e) => set('business', { registerNumber: e.target.value })} />
                  </Field>
                  <Field label="Register court" htmlFor="registerCourt">
                    <input id="registerCourt" type="text" value={b.registerCourt} onChange={(e) => set('business', { registerCourt: e.target.value })} />
                  </Field>
                </div>
              )}
              <Field label="Street and number" htmlFor="street" required>
                <input id="street" type="text" value={b.address.street} onChange={(e) => set('business', { address: { ...b.address, street: e.target.value } })} />
              </Field>
              <div className="form-grid">
                <Field label="Postcode" htmlFor="postcode" required>
                  <input id="postcode" type="text" value={b.address.postcode} onChange={(e) => set('business', { address: { ...b.address, postcode: e.target.value } })} />
                </Field>
                <Field label="City" htmlFor="city" required>
                  <input id="city" type="text" value={b.address.city} onChange={(e) => set('business', { address: { ...b.address, city: e.target.value } })} />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="card stack">
              <div className="form-grid">
                <Field label="First name" htmlFor="firstName" required>
                  <input id="firstName" type="text" autoComplete="given-name" value={c.firstName} onChange={(e) => set('contact', { firstName: e.target.value })} />
                </Field>
                <Field label="Last name" htmlFor="lastName" required>
                  <input id="lastName" type="text" autoComplete="family-name" value={c.lastName} onChange={(e) => set('contact', { lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Your role" htmlFor="role" hint="For example owner, brewer, managing director">
                <input id="role" type="text" value={c.role} onChange={(e) => set('contact', { role: e.target.value })} />
              </Field>
              <div className="form-grid">
                <Field label="Email" htmlFor="email" required hint="We send a confirmation link here">
                  <input id="email" type="email" autoComplete="email" value={c.email} onChange={(e) => set('contact', { email: e.target.value })} />
                </Field>
                <Field label="Phone" htmlFor="phone" required hint="With country code, for example +49 30 1234567">
                  <input id="phone" type="tel" autoComplete="tel" value={c.phone} onChange={(e) => set('contact', { phone: e.target.value })} />
                </Field>
              </div>
              <Field label="Website" htmlFor="website" required={!c.socialLinks} hint="We read your website as part of the review">
                <input id="website" type="url" placeholder="www.example.com" value={c.website} onChange={(e) => set('contact', { website: e.target.value })} />
              </Field>
              <Field label="Social media links" htmlFor="social" required={!c.website}>
                <input id="social" type="text" placeholder="instagram.com/yourshop" value={c.socialLinks} onChange={(e) => set('contact', { socialLinks: e.target.value })} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="card stack">
              <fieldset className="field">
                <legend>What do you sell?</legend>
                <div className="choices">
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <label className="choice" key={value}>
                      <input
                        type="checkbox"
                        checked={p.categories.includes(value)}
                        onChange={(e) =>
                          set('products', {
                            categories: e.target.checked ? [...p.categories, value] : p.categories.filter((x) => x !== value),
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {p.categories.includes('spirits') && (
                  <p className="hint">Spirits sellers need their alcohol tax status after approval. At launch, spirits are delivered within Germany only.</p>
                )}
              </fieldset>
              <fieldset className="field">
                <legend>Do you make the products yourself?</legend>
                <div className="choices">
                  {Object.entries(MAKES_OWN).map(([value, label]) => (
                    <label className="choice" key={value}>
                      <input type="radio" name="makes" checked={p.makesOwnProducts === value} onChange={() => set('products', { makesOwnProducts: value })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Your story" htmlFor="story" required hint={`Who makes the products, how and where. ${p.story.trim().length} characters, at least 80.`}>
                <textarea id="story" value={p.story} onChange={(e) => set('products', { story: e.target.value })} />
              </Field>
              <div className="field">
                <label htmlFor="photos">Sample photos (3 to 5)</label>
                <p className="hint">JPG, PNG or WebP, up to 8 MB each. A photo of a back label with ingredients helps us most.</p>
                {photos.length > 0 && (
                  <ul className="list-plain">
                    {photos.map((photo) => (
                      <li key={photo.id} className="row">
                        {photo.preview && <img src={photo.preview} alt="" width={64} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                        <span>{photo.name}</span>
                        <button type="button" className="link-button" onClick={() => setPhotos(photos.filter((x) => x.id !== photo.id))}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {photos.length < 5 && (
                  <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => void addPhotos(e.target.files)} />
                )}
              </div>
              <div className="form-grid">
                <Field label="Number of products" htmlFor="count" required hint="Roughly">
                  <input id="count" type="text" value={p.productCount} onChange={(e) => set('products', { productCount: e.target.value })} />
                </Field>
                <Field label="Price range" htmlFor="price" required hint="For example €8 to €35">
                  <input id="price" type="text" value={p.priceRange} onChange={(e) => set('products', { priceRange: e.target.value })} />
                </Field>
              </div>
              <Field label="Where do you sell today?" htmlFor="where" hint="Your own shop, markets, other platforms, shops">
                <textarea id="where" style={{ minHeight: 70 }} value={p.whereSoldToday} onChange={(e) => set('products', { whereSoldToday: e.target.value })} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="card stack">
              <fieldset className="field">
                <legend>Plan</legend>
                <div className="choices">
                  {Object.entries(PLANS).map(([value, plan]) => (
                    <label className="choice" key={value}>
                      <input type="radio" name="plan" checked={a.plan === value} onChange={() => set('agreement', { plan: value })} />
                      <span>
                        <strong>{plan.name}</strong>
                        <br />
                        <span className="muted small">{plan.detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Language for emails and your vendor panel" htmlFor="language" required>
                <select id="language" value={a.language} onChange={(e) => set('agreement', { language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="de" disabled>
                    Deutsch (coming later)
                  </option>
                </select>
              </Field>
              <label className="choice">
                <input type="checkbox" checked={a.acceptTerms} onChange={(e) => set('agreement', { acceptTerms: e.target.checked })} />
                <span>
                  I accept the <a href="#terms">vendor terms</a> and the <a href="#privacy">privacy policy</a>. [Texts to be added]
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={a.legalSelfCertification}
                  onChange={(e) => set('agreement', { legalSelfCertification: e.target.checked })}
                />
                <span>I confirm that my business may legally sell the products I offer, and that they comply with EU law.</span>
              </label>
              <div className="alert alert-info small">
                <strong>What happens next:</strong> we email you a link to confirm your address. Then our checks run and a member of
                our team reviews your application. AI helps us prepare the review, but a person always decides.
              </div>
            </div>
          )}

          <div className="spread">
            {step > 0 ? (
              <button type="button" className="btn" onClick={() => { setErrors([]); setStep(step - 1); scrollTop(); }}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                Continue
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
                {busy ? 'Sending…' : 'Send application'}
              </button>
            )}
          </div>
        </div>
      </main>
    </StorefrontShell>
  );
}
