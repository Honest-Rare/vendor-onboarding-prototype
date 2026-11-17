/**
 * In-browser stand-in for the backend.
 *
 * Every route below is the contract the real API has to provide: same method, path, request body and
 * response shape. State starts from fixtures, lives in localStorage (so a page reload keeps your changes),
 * and is reset with `resetMockData()` or the "Reset prototype data" link in the footer.
 *
 * Nothing here is secure or validated the way a server must be. It only has to make the screens work.
 */
import type { Gate, Section } from '../sections';
import type { Product, VendorPanel } from '../vendor-panel';
import { LUCID_PATTERN, readyToGoLive } from '../vendor-panel';
import applicationFixtures from './applications.json';
import { adminVendorFixtures, buildSections, type AdminVendor } from './admin-vendors';
import { vendorPanelFixture, type PrototypeState } from './vendor-panel-fixtures';

type Application = {
  id: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  data: any;
  photos: Array<{ id: string; name: string }>;
  dataFiles: Array<{ id: string; name: string }>;
  terms: { version: string | null; acceptedAt: string | null; legalSelfCertifiedAt: string | null };
  rules: { status: 'pending' | 'done' | 'failed'; result: any; error: string | null; updated_at: string } | null;
  ai: { status: 'pending' | 'done' | 'failed'; result: any; error: string | null; updated_at: string } | null;
  questions: Array<{ id: string; question: string; answer: string | null; asked_at: string; answered_at: string | null }>;
  events: Array<{ from_status: string | null; to_status: string | null; actor: string; reason: string | null; message: string | null; created_at: string; subject_type: string }>;
  vendorId: string | null;
};

type State = {
  version: number;
  sessions: { admin: boolean; vendor: boolean };
  applications: Application[];
  vendors: AdminVendor[];
  panel: VendorPanel;
  prototypeState: PrototypeState;
};

const STORAGE_KEY = 'hr-prototype-data';
const VERSION = 1;
const DAY = 86_400_000;

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const ago = (days: number) => iso(days * DAY);
const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function seed(): State {
  const applications: Application[] = (applicationFixtures as any[]).map((a) => ({
    id: a.id,
    status: a.status,
    createdAt: iso(a.createdAgoMs),
    submittedAt: iso(a.submittedAgoMs),
    decidedAt: null,
    data: a.data,
    photos: a.photos,
    dataFiles: a.dataFiles,
    terms: { version: null, acceptedAt: iso(a.submittedAgoMs), legalSelfCertifiedAt: iso(a.submittedAgoMs) },
    rules: { ...a.rules, updated_at: iso(a.submittedAgoMs - 60_000) },
    ai: { ...a.ai, updated_at: iso(a.submittedAgoMs - 60_000) },
    questions: a.questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      asked_at: iso(q.askedAgoMs),
      answered_at: q.answeredAgoMs === null ? null : iso(q.answeredAgoMs),
    })),
    // Newest first, as the history panel shows them.
    events: [...a.events]
      .sort((x: any, y: any) => x.agoMs - y.agoMs)
      .map((e: any) => ({
        from_status: null,
        to_status: e.to_status,
        actor: e.actor,
        reason: e.reason ?? null,
        message: e.message ?? null,
        created_at: iso(e.agoMs),
        subject_type: 'application',
      })),
    vendorId: null,
  }));
  return {
    version: VERSION,
    sessions: { admin: false, vendor: false },
    applications,
    vendors: adminVendorFixtures(ago),
    panel: vendorPanelFixture('onboarding', ago),
    prototypeState: 'onboarding',
  };
}

let state: State | null = null;

function db(): State {
  if (state) return state;
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const parsed = saved ? (JSON.parse(saved) as State) : null;
    state = parsed && parsed.version === VERSION ? parsed : seed();
  } catch {
    state = seed();
  }
  return state;
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: changes last until the tab closes
  }
}

export function resetMockData() {
  state = seed();
  persist();
}

// Uploaded files ------------------------------------------------------------------------------------

const uploads = new Map<string, string>();
let pendingUpload: { name: string; url: string } | null = null;

/** Called by `uploadFile` just before the request, so the handler can give the file an id. */
export function registerMockUpload(_path: string, file: File) {
  pendingUpload = { name: file.name, url: URL.createObjectURL(file) };
}

/** Sample files live in /public/mock-files; uploads made in this tab are object URLs. */
export function mockFileUrl(id: string) {
  return uploads.get(id) ?? `/mock-files/${encodeURIComponent(id)}`;
}

const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENTS = [...IMAGES, 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

function takeUpload(allowed: string[], body?: unknown): Res {
  const file = body instanceof FormData ? (body.get('file') as File | null) : null;
  if (!file || !pendingUpload) return fail(400, 'No file received.');
  if (!allowed.includes(file.type)) {
    pendingUpload = null;
    return fail(415, allowed === IMAGES ? `${file.name}: only JPG, PNG or WebP photos.` : `${file.name}: only JPG, PNG, WebP, PDF, CSV or Excel files.`);
  }
  if (file.size > 8 * 1024 * 1024) {
    pendingUpload = null;
    return fail(413, `${file.name} is larger than 8 MB.`);
  }
  const id = newId('upload');
  uploads.set(id, pendingUpload.url);
  pendingUpload = null;
  return ok({ id, name: file.name });
}

// Routing -------------------------------------------------------------------------------------------

type Res = { status: number; body: unknown };
const ok = (body: unknown = { ok: true }): Res => ({ status: 200, body });
const fail = (status: number, message: string, errors: Array<{ path: string; message: string }> = []): Res => ({
  status,
  body: { message, errors },
});

type Handler = (ctx: { params: Record<string, string>; query: URLSearchParams; body: any; s: State }) => Res;
const routes: Array<{ method: string; pattern: RegExp; keys: string[]; handler: Handler; auth?: 'admin' | 'vendor' }> = [];

function route(method: string, path: string, handler: Handler, auth?: 'admin' | 'vendor') {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' +
      path.replace(/:([a-zA-Z]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      }) +
      '$',
  );
  routes.push({ method, pattern, keys, handler, auth });
}

export function handleMockRequest(method: string, fullPath: string, body: unknown): Res {
  const [path, queryString = ''] = fullPath.split('?');
  const s = db();
  for (const r of routes) {
    if (r.method !== method) continue;
    const match = path.match(r.pattern);
    if (!match) continue;
    if (r.auth && !s.sessions[r.auth]) return fail(401, 'Please sign in.');
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
    const res = r.handler({ params, query: new URLSearchParams(queryString), body, s });
    if (method !== 'GET') persist();
    return res;
  }
  return fail(404, `The prototype has no ${method} ${path}.`);
}

// Auth ----------------------------------------------------------------------------------------------

route('POST', '/auth/login', ({ body, s }) => {
  // Prototype: any email and password sign in. Production uses single sign-on for admins.
  if (!body?.email || !body?.password) return fail(400, 'Enter your email and password.');
  s.sessions[body.role === 'admin' ? 'admin' : 'vendor'] = true;
  return ok();
});
route('POST', '/auth/logout', ({ s }) => {
  s.sessions = { admin: false, vendor: false };
  return ok();
});
route('POST', '/auth/set-password', ({ body, s }) => {
  if (!body?.password || body.password.length < 12) return fail(400, 'Use at least 12 characters.');
  s.sessions.vendor = true;
  s.panel.account.passwordSetAt = now();
  if (body.twoFactor) s.panel.account.twoFactor = true;
  return ok();
});
route('GET', '/auth/set-password', ({ s }) =>
  ok({ firstName: s.panel.account.firstName, email: s.panel.account.email, expiresAt: iso(-3 * DAY) }),
);

// Public: applications --------------------------------------------------------------------------------

route('POST', '/applications/photos', ({ body }) => takeUpload(IMAGES, body));
route('POST', '/applications/product-data', ({ body }) => takeUpload(DOCUMENTS, body));

// LATER(P2): emails (confirmation, question, approval and set-password links) are not sent; the screens link on.
route('POST', '/applications', ({ body, s }) => {
  const id = newId('app');
  s.applications.push({
    id,
    status: 'email_unconfirmed',
    createdAt: now(),
    submittedAt: null,
    decidedAt: null,
    data: body,
    photos: (body.products?.photoIds ?? []).map((pid: string, i: number) => ({ id: pid, name: `Photo ${i + 1}` })),
    dataFiles: (body.products?.dataFileIds ?? []).map((fid: string, i: number) => ({ id: fid, name: `File ${i + 1}` })),
    terms: { version: null, acceptedAt: now(), legalSelfCertifiedAt: now() },
    rules: null,
    ai: null,
    questions: [],
    events: [{ from_status: null, to_status: 'email_unconfirmed', actor: 'applicant', reason: null, message: null, created_at: now(), subject_type: 'application' }],
    vendorId: null,
  });
  // In the prototype the confirmation token is the application id.
  return ok({ id, token: id });
});

route('POST', '/applications/confirm', ({ body, s }) => {
  const a = s.applications.find((x) => x.id === body?.token);
  if (!a) return fail(404, 'This link is not valid any more.');
  if (a.status === 'email_unconfirmed') {
    a.status = 'in_review';
    a.submittedAt = now();
    a.rules = { status: 'done', result: simulatedRules(a), error: null, updated_at: now() };
    a.ai = { status: 'done', result: simulatedAi(), error: null, updated_at: now() };
    a.events.unshift(
      { from_status: 'submitted', to_status: 'in_review', actor: 'system', reason: null, message: null, created_at: now(), subject_type: 'application' },
      { from_status: 'email_unconfirmed', to_status: 'submitted', actor: 'applicant', reason: null, message: null, created_at: now(), subject_type: 'application' },
    );
  }
  return ok({ shopName: a.data.business.shopName });
});

route('GET', '/applications/question', ({ query, s }) => {
  const token = query.get('token');
  const a = s.applications.find((x) => x.questions.some((q) => q.id === token && !q.answer)) ?? s.applications.find((x) => x.status === 'needs_info');
  const q = a?.questions.find((x) => !x.answer);
  if (!a || !q) return fail(404, 'This link is not valid any more.');
  return ok({ shopName: a.data.business.shopName, question: q.question, token: q.id });
});

route('POST', '/applications/answer', ({ body, s }) => {
  if (!body?.answer?.trim()) return fail(400, 'Write your answer first.');
  const a = s.applications.find((x) => x.questions.some((q) => q.id === body.token)) ?? s.applications.find((x) => x.status === 'needs_info');
  const q = a?.questions.find((x) => x.id === body.token) ?? a?.questions.find((x) => !x.answer);
  if (!a || !q) return fail(404, 'This link is not valid any more.');
  q.answer = body.answer;
  q.answered_at = now();
  a.events.unshift({ from_status: a.status, to_status: 'in_review', actor: 'applicant', reason: null, message: body.answer, created_at: now(), subject_type: 'application' });
  a.status = 'in_review';
  return ok();
});

// LATER(P2): real checks (EU VIES VAT check, website reachability, duplicates across all vendors).
function simulatedRules(a: Application) {
  const b = a.data.business;
  const c = a.data.contact;
  return [
    { code: 'eu_registered', label: 'Registered in the EU', detail: b.country, outcome: ['CH', 'GB', 'NO'].includes(b.country) ? 'fail' : 'pass' },
    { code: 'vat', label: 'VAT ID (EU VIES)', detail: 'Format is valid. Live VIES check is switched off.', outcome: 'unknown' },
    { code: 'duplicates', label: 'Duplicate check', detail: 'No matches with other applications or vendors.', outcome: 'pass' },
    { code: 'email_domain', label: 'Email domain', detail: String(c.email).split('@')[1] ?? '', outcome: 'pass' },
    { code: 'phone', label: 'Phone format', detail: String(c.phone).replace(/[^\d+]/g, ''), outcome: 'pass' },
    { code: 'website', label: 'Website reachable', detail: 'Prototype: not checked.', outcome: 'unknown' },
    { code: 'address', label: 'Business address', detail: 'Street address given.', outcome: 'pass' },
  ];
}

// LATER(P2): AI screening with the real model; only the 5 sample applications have scripted results.
function simulatedAi() {
  return {
    simulated: true,
    recommendation: 'needs_a_look',
    confidence: 0.5,
    summary: 'Prototype: no AI model has read this application. A person reviews it against our criteria.',
    criteria: ['regional', 'not_mainstream', 'quality', 'natural'].map((criterion) => ({
      criterion,
      assessment: 'no_information',
      note: 'Not screened in the prototype.',
      source: null,
    })),
    flags: [],
    sourcesChecked: [],
    suggestedQuestion: '',
    provider: 'simulated',
    promptVersion: 'vendor-screening-v1',
  };
}

// Admin: applications -----------------------------------------------------------------------------

const OPEN = ['submitted', 'in_review', 'needs_info'];

route(
  'GET',
  '/admin/applications',
  ({ query, s }) => {
    const filter = query.get('filter') ?? 'open';
    const visible = s.applications.filter((a) => a.status !== 'email_unconfirmed');
    const items = visible
      .filter((a) => (filter === 'open' ? OPEN.includes(a.status) : filter === 'decided' ? !OPEN.includes(a.status) : true))
      .sort((x, y) => (x.submittedAt ?? x.createdAt).localeCompare(y.submittedAt ?? y.createdAt))
      .map((a) => ({
        id: a.id,
        status: a.status,
        shop_name: a.data.business.shopName,
        legal_name: a.data.business.legalName,
        country: a.data.business.country,
        categories: a.data.products.categories,
        created_at: a.createdAt,
        submitted_at: a.submittedAt,
        decided_at: a.decidedAt,
        ai_status: a.ai?.status ?? null,
        ai_recommendation: a.ai?.result?.recommendation ?? null,
        ai_confidence: a.ai?.result?.confidence ?? null,
        rule_fails: a.rules?.result?.filter((r: any) => r.outcome === 'fail').length ?? 0,
      }));
    const counts: Record<string, number> = {};
    for (const a of visible) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return ok({ items, counts });
  },
  'admin',
);

route(
  'GET',
  '/admin/applications/:id',
  ({ params, s }) => {
    const a = s.applications.find((x) => x.id === params.id);
    return a ? ok(a) : fail(404, 'Application not found.');
  },
  'admin',
);

function decide(s: State, id: string, to: string, reason: string | null, message: string | null) {
  const a = s.applications.find((x) => x.id === id);
  if (!a) return null;
  a.events.unshift({ from_status: a.status, to_status: to, actor: 'admin', reason, message, created_at: now(), subject_type: 'application' });
  a.status = to;
  return a;
}

route(
  'POST',
  '/admin/applications/:id/approve',
  ({ params, body, s }) => {
    if (!body?.reason?.trim()) return fail(400, 'Give a short reason for the audit log.');
    const a = decide(s, params.id, 'approved', body.reason, null);
    if (!a) return fail(404, 'Application not found.');
    a.decidedAt = now();
    const existing = s.vendors.find((v) => v.application.id === a.id);
    if (existing) {
      a.vendorId = existing.vendor.id;
    } else {
      const b = a.data.business;
      const vendorId = newId('vendor');
      a.vendorId = vendorId;
      s.vendors.push({
        vendor: {
          id: vendorId,
          shopName: b.shopName,
          status: 'onboarding',
          createdAt: now(),
          liveAt: null,
          stripeAccountId: null,
          legalName: b.legalName,
          vatId: b.vatId || null,
          taxNumber: b.taxNumber || null,
          address: { ...b.address, country: b.country },
          slug: b.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          preModeration: true,
        },
        application: { id: a.id, legalName: b.legalName, email: a.data.contact.email, country: b.country, categories: a.data.products.categories },
        sections: buildSections(a.data.products.categories, {}, now()),
        events: [{ subject_type: 'vendor', from_status: null, to_status: 'onboarding', actor: 'admin', reason: null, meta: null, created_at: now() }],
      });
    }
    return ok();
  },
  'admin',
);

route(
  'POST',
  '/admin/applications/:id/reject',
  ({ params, body, s }) => {
    if (!body?.reason?.trim() || !body?.message?.trim()) return fail(400, 'Give a reason and a message for the applicant.');
    const a = decide(s, params.id, 'rejected', body.reason, body.message);
    if (!a) return fail(404, 'Application not found.');
    a.decidedAt = now();
    return ok();
  },
  'admin',
);

route(
  'POST',
  '/admin/applications/:id/ask',
  ({ params, body, s }) => {
    if (!body?.question?.trim()) return fail(400, 'Write the question first.');
    const a = decide(s, params.id, 'needs_info', null, body.question);
    if (!a) return fail(404, 'Application not found.');
    a.questions.push({ id: newId('q'), question: body.question, answer: null, asked_at: now(), answered_at: null });
    return ok();
  },
  'admin',
);

route(
  'POST',
  '/admin/applications/:id/rescreen',
  ({ params, s }) => {
    const a = s.applications.find((x) => x.id === params.id);
    if (!a) return fail(404, 'Application not found.');
    a.events.unshift({ from_status: null, to_status: null, actor: 'admin', reason: 'Reran checks', message: null, created_at: now(), subject_type: 'application' });
    if (a.rules) a.rules.updated_at = now();
    return ok();
  },
  'admin',
);

// Admin: vendors --------------------------------------------------------------------------------------

function gate(v: AdminVendor): Gate {
  const inGate = v.sections.filter((x) => x.requiredBefore === 'go_live');
  return {
    ready: inGate.every((x) => x.status === 'approved'),
    approved: inGate.filter((x) => x.status === 'approved').length,
    total: inGate.length,
    waitingForReview: inGate.filter((x) => x.status === 'submitted').map((x) => x.title),
    needsVendorAction: inGate.filter((x) => x.status === 'not_started' || x.status === 'changes_requested').map((x) => x.title),
  };
}

route(
  'GET',
  '/admin/vendors',
  ({ s }) =>
    ok(
      s.vendors.map((v) => {
        const g = gate(v);
        return {
          id: v.vendor.id,
          shop_name: v.vendor.shopName,
          status: v.vendor.status,
          created_at: v.vendor.createdAt,
          live_at: v.vendor.liveAt,
          waiting: g.waitingForReview.length,
          approved: g.approved,
          total: g.total,
        };
      }),
    ),
  'admin',
);

route(
  'GET',
  '/admin/vendors/:id',
  ({ params, s }) => {
    const v = s.vendors.find((x) => x.vendor.id === params.id);
    return v ? ok({ ...v, gate: gate(v) }) : fail(404, 'Vendor not found.');
  },
  'admin',
);

route(
  'POST',
  '/admin/vendors/:id/sections/:key/review',
  ({ params, body, s }) => {
    const v = s.vendors.find((x) => x.vendor.id === params.id);
    const section: Section | undefined = v?.sections.find((x) => x.key === params.key);
    if (!v || !section) return fail(404, 'Section not found.');
    if (body?.decision === 'request_changes' && (!body.note || body.note.trim().length < 3)) return fail(400, 'Tell the vendor what to change.');
    const to = body?.decision === 'approve' ? 'approved' : 'changes_requested';
    v.events.unshift({ subject_type: 'section', from_status: section.status, to_status: to, actor: 'admin', reason: body?.note || null, meta: { key: section.key }, created_at: now() });
    section.status = to;
    section.adminNote = to === 'changes_requested' ? body.note : null;
    section.reviewedAt = now();
    if (gate(v).ready && v.vendor.status === 'onboarding') v.vendor.status = 'ready';
    return ok();
  },
  'admin',
);

route(
  'POST',
  '/admin/vendors/:id/pre-moderation',
  ({ params, body, s }) => {
    const v = s.vendors.find((x) => x.vendor.id === params.id);
    if (!v) return fail(404, 'Vendor not found.');
    v.vendor.preModeration = Boolean(body?.enabled);
    return ok();
  },
  'admin',
);

// Vendor panel ----------------------------------------------------------------------------------------

route('GET', '/vendor/panel', ({ s }) => ok({ ...s.panel, prototypeState: s.prototypeState }), 'vendor');

route('POST', '/vendor/uploads', ({ body }) => takeUpload(DOCUMENTS, body), 'vendor');

/** Prototype only: jump between the states the designs show. */
route(
  'POST',
  '/vendor/prototype-state',
  ({ body, s }) => {
    const next = body?.state as PrototypeState;
    if (!['onboarding', 'ready', 'live'].includes(next)) return fail(400, 'Unknown prototype state.');
    s.panel = vendorPanelFixture(next, ago);
    s.prototypeState = next;
    return ok();
  },
  'vendor',
);

route(
  'PUT',
  '/vendor/shop',
  ({ body, s }) => {
    s.panel.shop = { ...s.panel.shop, ...body };
    return ok(s.panel.shop);
  },
  'vendor',
);

/** Prototype stand-in for the AI translation and SEO drafts. The vendor reviews every draft before it's used. */
// LATER(P2): AI drafts for the English story and meta description.
route(
  'POST',
  '/vendor/shop/draft',
  ({ body, s }) => {
    const kind = body?.kind;
    if (kind === 'story_en') {
      return ok({
        text: `[AI draft of the English story, from your German story. Prototype: no AI model was called.]\n\n${s.panel.shop.storyDe}`,
      });
    }
    if (kind === 'meta_description') {
      return ok({ text: `[AI draft] ${s.panel.shop.name}: small-batch spirits from ${s.panel.shop.town || '[Region]'}, distilled and bottled by hand.` });
    }
    return fail(400, 'Unknown draft.');
  },
  'vendor',
);

function productErrors(p: Product) {
  const errors: Array<{ path: string; message: string }> = [];
  if (!p.name.trim()) errors.push({ path: 'name', message: 'Give the product a name.' });
  if (p.photos.length === 0) errors.push({ path: 'photos', message: 'Add at least one photo.' });
  if (!p.price.trim()) errors.push({ path: 'price', message: 'Enter the price.' });
  if (p.category !== 'gift_set') {
    if (!p.legalName.trim()) errors.push({ path: 'legalName', message: 'Enter the legal product name.' });
    if (!p.netQuantity.trim()) errors.push({ path: 'netQuantity', message: 'Enter the net quantity.' });
    if (!p.allergens.trim()) errors.push({ path: 'allergens', message: 'Enter the allergens, or "None".' });
  }
  return errors;
}

route(
  'POST',
  '/vendor/products',
  ({ body, s }) => {
    const p = { ...(body as Product), id: newId('p'), status: 'draft' as const, sentAt: null, note: null };
    s.panel.products.push(p);
    return ok(p);
  },
  'vendor',
);

route(
  'PUT',
  '/vendor/products/:id',
  ({ params, body, s }) => {
    const i = s.panel.products.findIndex((x) => x.id === params.id);
    if (i < 0) return fail(404, 'Product not found.');
    const current = s.panel.products[i];
    const next: Product = { ...current, ...(body?.product ?? {}), id: current.id };
    if (body?.send) {
      const errors = productErrors(next);
      if (errors.length) return fail(422, 'Some details are missing.', errors);
      next.status = 'in_review';
      next.sentAt = now();
      next.note = null;
    } else if (current.status === 'returned') {
      // Saving a draft of a returned product keeps the note until it's sent again.
      next.status = 'returned';
    }
    s.panel.products[i] = next;
    return ok(next);
  },
  'vendor',
);

// LATER(P2): import from Shopify and Shopware.
route(
  'POST',
  '/vendor/products/import',
  ({ body, s }) => {
    if (!body?.address?.trim() || !body?.key?.trim()) return fail(400, 'Enter your shop address and access key.');
    // Prototype: one imported product arrives as a draft.
    const p: Product = {
      ...s.panel.products[0],
      id: newId('p'),
      name: `[Imported from ${body.platform === 'shopware' ? 'Shopware' : 'Shopify'}]`,
      status: 'draft',
      sentAt: null,
      note: null,
      allergens: '',
      legalName: '',
    };
    s.panel.products.push(p);
    return ok({ imported: 1 });
  },
  'vendor',
);

route(
  'PUT',
  '/vendor/payouts',
  ({ body, s }) => {
    s.panel.payouts.invoiceEmail = body?.invoiceEmail ?? '';
    return ok();
  },
  'vendor',
);

/** Prototype stand-in for Stripe's hosted onboarding: returning from Stripe with everything done. */
// LATER(P2): Stripe Connect onboarding and its status webhooks.
route(
  'POST',
  '/vendor/payouts/stripe-complete',
  ({ s }) => {
    s.panel.payouts.enabled = true;
    s.panel.payouts.requirement = null;
    s.panel.payouts.checks = s.panel.payouts.checks.map((c) => ({ ...c, status: 'done' }));
    return ok();
  },
  'vendor',
);

route(
  'PUT',
  '/vendor/legal',
  ({ body, s }) => {
    s.panel.legal = { ...s.panel.legal, ...body };
    return ok(s.panel.legal);
  },
  'vendor',
);

/** Checks the number against the public LUCID register. Prototype: checks the format only. */
// LATER(P2): look the number up in the public LUCID register.
route(
  'POST',
  '/vendor/legal/lucid',
  ({ body, s }) => {
    const number = String(body?.number ?? '').replace(/\s/g, '').toUpperCase();
    if (!LUCID_PATTERN.test(number)) {
      return fail(422, 'This is not a LUCID registration number. It starts with DE followed by 13 digits.', [
        { path: 'lucidNumber', message: 'Starts with DE followed by 13 digits.' },
      ]);
    }
    s.panel.legal.lucidNumber = number;
    return ok({ lucidNumber: number });
  },
  'vendor',
);

route(
  'PUT',
  '/vendor/shipping',
  ({ body, s }) => {
    s.panel.shipping = { ...s.panel.shipping, ...body };
    return ok(s.panel.shipping);
  },
  'vendor',
);

route(
  'PUT',
  '/vendor/settings',
  ({ body, s }) => {
    s.panel.account = { ...s.panel.account, ...body };
    return ok(s.panel.account);
  },
  'vendor',
);

// LATER(P2): admin final approval of go-live; the admin console and vendor panel use separate sample data.
route(
  'POST',
  '/vendor/go-live',
  ({ s }) => {
    if (!readyToGoLive(s.panel)) return fail(409, 'Some checks have not passed yet.');
    s.panel.stage = 'submitted';
    return ok();
  },
  'vendor',
);
