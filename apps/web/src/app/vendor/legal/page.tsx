'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field } from '@/components/ui';
import { fileUrl, formatDate } from '@/lib/api';
import { legalParts, type FileRef, type VendorPanel } from '@/lib/vendor-panel';
import { DoneChip, SavedNote, UploadButton, useAction } from '../_parts/forms';

const COUNTRIES: Array<[string, string]> = [
  ['DE', 'Germany'],
  ['AT', 'Austria'],
  ['BE', 'Belgium'],
  ['DK', 'Denmark'],
  ['ES', 'Spain'],
  ['FR', 'France'],
  ['IT', 'Italy'],
  ['LU', 'Luxembourg'],
  ['NL', 'Netherlands'],
  ['PL', 'Poland'],
  ['CZ', 'Czechia'],
];

type Legal = VendorPanel['legal'];

function SectionHead({ title, done }: { title: string; done: boolean }) {
  return (
    <div className="spread" style={{ gap: 8 }}>
      <h2>{title}</h2>
      <DoneChip done={done} />
    </div>
  );
}

function FileLine({ file }: { file: FileRef }) {
  return (
    <>
      <a href={fileUrl(file.id)} target="_blank" rel="noreferrer">
        {file.name}
      </a>{' '}
      · uploaded {formatDate(file.uploadedAt)}
    </>
  );
}

function DocRow({ title, sub, right, dashed }: { title: string; sub: ReactNode; right: ReactNode; dashed?: boolean }) {
  return (
    <div className={`row-box${dashed ? ' dashed' : ''}`} style={{ flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {sub}
        </div>
      </div>
      {right}
    </div>
  );
}

export default function VendorLegalPage() {
  const { panel, save } = useVendorPanel();
  const legal = panel.legal;
  const parts = legalParts(panel);
  const spirits = panel.business.categories.includes('spirits');
  const saveLegal = (patch: Partial<Legal>) => save('/vendor/legal', patch);

  // Tax reporting form
  const [tax, setTax] = useState({
    taxId: legal.taxId,
    taxCountry: legal.taxCountry,
    dateOfBirth: legal.dateOfBirth,
    otherEstablishments: legal.otherEstablishments,
  });
  const taxAction = useAction();

  // LUCID
  const [lucid, setLucid] = useState(legal.lucidNumber);
  const lucidAction = useAction();

  // Food and drinks form
  const [food, setFood] = useState({ alcoholTaxStatus: legal.alcoholTaxStatus, taxRepresentative: legal.taxRepresentative });
  const foodAction = useAction();

  // The panel loads before this page renders, so the browser's own jump to #lucid etc. has nothing to land on yet.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  const pills: Array<{ href: string; label: string; done: boolean }> = [
    { href: '#identity', label: 'Trader identity', done: parts.traderIdentity },
    { href: '#tax', label: 'Tax reporting', done: parts.taxReporting },
    { href: '#lucid', label: 'Packaging (LUCID)', done: parts.packaging },
    { href: '#food', label: 'Food and drinks', done: parts.foodAndDrinks },
  ];

  return (
    <div className="vendor-page" style={{ maxWidth: 860 }}>
      <div>
        <h1>Legal and tax</h1>
        <p className="lead">
          We need this by law before your shop can sell. Save any section and come back later. Once you are live, changes here
          are checked by Honest &amp; Rare before they apply.
        </p>
      </div>

      <nav aria-label="Sections" className="row" style={{ gap: 8 }}>
        {pills.map((p) => (
          <a
            key={p.href}
            href={p.href}
            className={`chip ${p.done ? 'chip-done' : 'chip-todo'}`}
            style={{ padding: '8px 12px', borderRadius: 16, fontSize: 13, textDecoration: 'none', color: p.done ? undefined : 'var(--ink)' }}
          >
            <span aria-hidden="true">{p.done ? '✓' : '○'} </span>
            {p.label}
            <span className="visually-hidden">{p.done ? ' (done)' : ' (to do)'}</span>
          </a>
        ))}
      </nav>

      <section id="identity" className="card stack" style={{ gap: 14 }}>
        <SectionHead title="Trader identity" done={parts.traderIdentity} />
        <DocRow
          title="ID document of the legal representative"
          sub="Checked through Stripe's identity verification"
          right={
            legal.idVerifiedByStripe ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--good-ink)' }}>✓ Verified by Stripe</span>
            ) : (
              <Link href="/vendor/payouts" style={{ fontSize: 14 }}>
                Waiting for Stripe
              </Link>
            )
          }
        />
        <DocRow
          title="Trade register extract or business registration"
          dashed={!legal.registerExtract}
          sub={legal.registerExtract ? <FileLine file={legal.registerExtract} /> : 'PDF or photo of the current extract'}
          right={
            <span className="row" style={{ gap: 12 }}>
              {legal.registerExtract && (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--info-ink)' }}>Checked at final approval</span>
              )}
              <UploadButton
                label={legal.registerExtract ? 'Replace' : 'Upload'}
                context="trade register extract"
                onUploaded={(f) => saveLegal({ registerExtract: f })}
              />
            </span>
          }
        />
      </section>

      <section id="tax" className="card">
        <form
          className="stack"
          style={{ gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            void taxAction.run(() => saveLegal({ ...tax, taxId: tax.taxId.trim() }));
          }}
        >
          <SectionHead title="Tax reporting (DAC7)" done={parts.taxReporting} />
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            We report seller data to the tax office once a year, as EU law requires.
          </p>
          <ErrorBox error={taxAction.error} />
          <div className="form-grid" style={{ gap: 12 }}>
            <Field label="Tax ID" htmlFor="tax-id" required>
              <input id="tax-id" type="text" value={tax.taxId} onChange={(e) => setTax({ ...tax, taxId: e.target.value })} />
            </Field>
            <Field label="Issuing country" htmlFor="tax-country" required>
              <select id="tax-country" value={tax.taxCountry} onChange={(e) => setTax({ ...tax, taxCountry: e.target.value })}>
                {!tax.taxCountry && <option value="">Choose…</option>}
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth (sole traders only)" htmlFor="dob" required>
              <input
                id="dob"
                type="text"
                inputMode="numeric"
                placeholder="DD.MM.YYYY"
                value={tax.dateOfBirth}
                onChange={(e) => setTax({ ...tax, dateOfBirth: e.target.value })}
              />
            </Field>
          </div>
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={tax.otherEstablishments}
              onChange={(e) => setTax({ ...tax, otherEstablishments: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            I have permanent establishments in other EU countries
          </label>
          <span className="muted" style={{ fontSize: 12 }}>
            If ticked, you&apos;ll be asked which countries.
          </span>
          <div className="row">
            <button className="btn" disabled={taxAction.busy}>
              {taxAction.busy ? 'Saving…' : 'Save tax data'}
            </button>
            <SavedNote saved={taxAction.saved} />
          </div>
        </form>
      </section>

      <section id="lucid" className={`card stack${parts.packaging ? '' : ' card-focus'}`} style={{ gap: 10 }}>
        <SectionHead title="Packaging (LUCID)" done={parts.packaging} />
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          German packaging law requires a registration in the public LUCID register before you ship.
        </p>
        <form
          className="stack"
          style={{ gap: 6 }}
          onSubmit={(e) => {
            e.preventDefault();
            void lucidAction.run(() => save('/vendor/legal/lucid', { number: lucid }, 'POST'));
          }}
        >
          <label htmlFor="lucid-number" style={{ fontSize: 13, fontWeight: 600 }}>
            LUCID registration number
          </label>
          <div className="row" style={{ gap: 8 }}>
            <input
              id="lucid-number"
              type="text"
              placeholder="DE…"
              autoComplete="off"
              value={lucid}
              aria-invalid={Boolean(lucidAction.error)}
              aria-describedby={lucidAction.error ? 'lucid-error lucid-hint' : 'lucid-hint'}
              onChange={(e) => {
                setLucid(e.target.value);
                lucidAction.clearSaved();
              }}
              style={{ flex: '1 1 240px', width: 'auto', minWidth: 0 }}
            />
            <button className="btn btn-primary" disabled={lucidAction.busy || !lucid.trim()}>
              {lucidAction.busy ? 'Checking…' : 'Check and save'}
            </button>
          </div>
          {lucidAction.error && (
            <p id="lucid-error" role="alert" className="small" style={{ margin: 0, color: 'var(--bad-ink)' }}>
              {lucidAction.error.message}
            </p>
          )}
          <SavedNote saved={lucidAction.saved} text="Found in the register and saved" />
          <span id="lucid-hint" className="muted" style={{ fontSize: 12 }}>
            We check the number against the public register right away.{' '}
            <a href="https://lucid.verpackungsregister.org/" target="_blank" rel="noreferrer">
              Not registered yet?
            </a>
          </span>
        </form>
      </section>

      <section id="food" className="card">
        <form
          className="stack"
          style={{ gap: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            void foodAction.run(() => saveLegal({ ...food, taxRepresentative: food.taxRepresentative.trim() }));
          }}
        >
          <SectionHead title="Food and drinks" done={parts.foodAndDrinks} />
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Based on the categories you were approved for: {panel.business.categories.join(', ')}.
          </p>
          <ErrorBox error={foodAction.error} />
          <DocRow
            title="Food business registration"
            dashed={!legal.foodRegistration}
            sub={legal.foodRegistration ? <FileLine file={legal.foodRegistration} /> : 'From your local food authority'}
            right={
              <UploadButton
                label={legal.foodRegistration ? 'Replace' : 'Upload'}
                context="food business registration"
                onUploaded={(f) => saveLegal({ foodRegistration: f })}
              />
            }
          />
          {spirits && (
            <>
              <Field label="Alcohol tax status (spirits)" htmlFor="alcohol-tax" required>
                <select
                  id="alcohol-tax"
                  value={food.alcoholTaxStatus}
                  onChange={(e) => setFood({ ...food, alcoholTaxStatus: e.target.value as Legal['alcoholTaxStatus'] })}
                >
                  {!food.alcoholTaxStatus && <option value="">Choose…</option>}
                  <option value="tax_paid">Tax-paid</option>
                  <option value="bonded">Bonded warehouse</option>
                </select>
              </Field>
              <Field label="Tax representative for cross-border sales (spirits, if you ship abroad)" htmlFor="tax-rep">
                <input
                  id="tax-rep"
                  type="text"
                  placeholder="Name and address"
                  value={food.taxRepresentative}
                  onChange={(e) => setFood({ ...food, taxRepresentative: e.target.value })}
                />
              </Field>
            </>
          )}
          <DocRow
            title="Organic certificate and certification body code"
            dashed={!legal.organicCertificate}
            sub={legal.organicCertificate ? <FileLine file={legal.organicCertificate} /> : 'Only if you make organic claims'}
            right={
              <UploadButton
                label={legal.organicCertificate ? 'Replace' : 'Upload'}
                context="organic certificate"
                onUploaded={(f) => saveLegal({ organicCertificate: f })}
              />
            }
          />
          <DocRow
            title="Other certificates and awards"
            dashed
            sub={
              legal.otherCertificates.length ? (
                <span className="stack" style={{ gap: 2 }}>
                  {legal.otherCertificates.map((f) => (
                    <span key={f.id}>
                      <FileLine file={f} />
                    </span>
                  ))}
                  <span>Optional · shown on your shop page once checked</span>
                </span>
              ) : (
                'Optional · shown on your shop page once checked'
              )
            }
            right={
              <UploadButton
                label="Upload"
                context="certificate or award"
                onUploaded={(f) => saveLegal({ otherCertificates: [...legal.otherCertificates, f] })}
              />
            }
          />
          {spirits && (
            <div className="row">
              <button className="btn" disabled={foodAction.busy}>
                {foodAction.busy ? 'Saving…' : 'Save'}
              </button>
              <SavedNote saved={foodAction.saved} />
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
