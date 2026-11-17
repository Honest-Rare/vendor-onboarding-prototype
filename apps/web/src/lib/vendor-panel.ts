/**
 * Vendor panel: data shapes and the status rules shared by every vendor page.
 *
 * `GET /vendor/panel` returns a `VendorPanel`. Pages never store their own copy of a status: they call the
 * `derive*` helpers below, so the sidebar, the overview and the go-live checks always agree.
 */

export type Stage = 'onboarding' | 'submitted' | 'live';
export type FileRef = { id: string; name: string; uploadedAt: string };

export type ProductStatus = 'draft' | 'in_review' | 'returned' | 'approved' | 'live';
export type Product = {
  id: string;
  status: ProductStatus;
  sentAt: string | null;
  /** Note from Honest & Rare when returned. */
  note: string | null;
  name: string;
  category: 'spirits' | 'liqueur' | 'beer' | 'wine' | 'food' | 'gift_set';
  brand: string;
  description: string;
  photos: string[];
  price: string;
  vatRate: '19' | '7';
  stock: string;
  weightAndSize: string;
  dimensions: string;
  legalName: string;
  netQuantity: string;
  abv: string;
  minAge: 'none' | '16' | '18';
  countryOfOrigin: string;
  storage: string;
  bottler: string;
  bestBefore: string;
  ageWarning: string;
  allergens: string;
  deposit: boolean;
  organicClaim: boolean;
  containsAlcohol: boolean;
  attributes: Record<string, string>;
  safety: { manufacturer: string; identifier: string; warnings: string; care: string };
};

export type StripeCheck = { key: string; label: string; note: string; status: 'done' | 'needs_document' };

export type ShippingOption = { id: string; zone: string; option: string; cost: string; deliveryTime: string; freeFrom: string };
export type PickupPoint = { id: string; name: string; address: string; hours: string };

export type LiveTask = { id: string; kind: 'expires' | 'in_review' | 'yearly'; title: string; detail: string; action: string; href: string };

export type VendorPanel = {
  stage: Stage;
  account: {
    firstName: string;
    email: string;
    passwordSetAt: string;
    twoFactor: boolean;
    language: 'de' | 'en';
  };
  business: {
    legalName: string;
    address: string;
    /** Categories approved with the application; they decide which legal fields apply. */
    categories: Array<'spirits' | 'beer' | 'wine' | 'food'>;
  };
  shop: {
    name: string;
    logo: string | null;
    banner: string | null;
    workshopPhotos: string[];
    storyDe: string;
    storyEn: string;
    town: string;
    links: string;
    emailLogo: string | null;
    favicon: string | null;
    seoTitle: string;
    seoDescription: string;
    analyticsId: string;
    pixelId: string;
  };
  products: Product[];
  payouts: {
    enabled: boolean;
    /** What Stripe still asks for, in Stripe's words. Null when nothing is due. */
    requirement: string | null;
    checks: StripeCheck[];
    invoiceEmail: string;
    accountingContactId: string | null;
  };
  legal: {
    idVerifiedByStripe: boolean;
    registerExtract: FileRef | null;
    taxId: string;
    taxCountry: string;
    dateOfBirth: string;
    otherEstablishments: boolean;
    lucidNumber: string;
    foodRegistration: FileRef | null;
    alcoholTaxStatus: '' | 'tax_paid' | 'bonded';
    taxRepresentative: string;
    organicCertificate: FileRef | null;
    otherCertificates: FileRef[];
  };
  shipping: {
    dispatchSameAsBusiness: boolean;
    dispatchAddress: string;
    returnsAddress: string;
    options: ShippingOption[];
    ageCheck16: boolean;
    ageCheck18: boolean;
    pickupPoints: PickupPoint[];
    processingDays: string;
    minimumOrder: string;
    closures: string;
  };
  /** Shown on the overview after go-live. */
  liveTasks: LiveTask[];
};

// ---------------------------------------------------------------------------------------------------
// Status rules

export type Mark = 'done' | 'progress' | 'waiting' | 'needs' | 'locked' | 'none';
export type Chip = { label: string; tone: 'done' | 'progress' | 'waiting' | 'todo' };

export const LUCID_PATTERN = /^DE\d{13}$/;

export function sellsAlcohol(p: VendorPanel) {
  return p.business.categories.some((c) => c === 'spirits' || c === 'beer' || c === 'wine');
}

export function shopSections(p: VendorPanel) {
  const s = p.shop;
  return {
    logoAndBanner: Boolean(s.logo && s.banner),
    storyDe: s.storyDe.trim().length > 0,
    storyEn: s.storyEn.trim().length > 0,
    location: s.town.trim().length > 0,
    /** Legal notice and policies are generated from legal and shipping data. */
    legalNotice: true,
  };
}

export function shopProfileComplete(p: VendorPanel) {
  const s = shopSections(p);
  return s.logoAndBanner && s.storyDe && s.storyEn && s.location && s.legalNotice;
}

export function shopSectionsDone(p: VendorPanel) {
  const s = shopSections(p);
  return [s.logoAndBanner, s.storyDe && s.storyEn, s.location, s.legalNotice].filter(Boolean).length;
}

export function productCounts(p: VendorPanel) {
  const by = (status: ProductStatus) => p.products.filter((x) => x.status === status).length;
  return { approved: by('approved') + by('live'), inReview: by('in_review'), returned: by('returned'), draft: by('draft') };
}

export function legalParts(p: VendorPanel) {
  const l = p.legal;
  const alcohol = sellsAlcohol(p);
  return {
    traderIdentity: l.idVerifiedByStripe && Boolean(l.registerExtract),
    taxReporting: Boolean(l.taxId.trim() && l.taxCountry),
    packaging: LUCID_PATTERN.test(l.lucidNumber),
    foodAndDrinks: Boolean(l.foodRegistration) && (!p.business.categories.includes('spirits') || Boolean(l.alcoholTaxStatus)),
    alcohol,
  };
}

export function shippingComplete(p: VendorPanel) {
  const s = p.shipping;
  const ageOk = !sellsAlcohol(p) || s.ageCheck18 || s.ageCheck16;
  return s.options.length > 0 && Boolean(s.returnsAddress.trim()) && Boolean(s.processingDays.trim()) && ageOk;
}

export type GateCheck = { key: string; label: string; ok: boolean; state: string };

/** The automatic go-live checks. When every one passes, the vendor can send the shop for final approval. */
export function gateChecks(p: VendorPanel): GateCheck[] {
  const legal = legalParts(p);
  const s = shopSections(p);
  const products = productCounts(p);
  const profileMissing = !s.logoAndBanner ? 'Logo or banner missing' : !(s.storyDe && s.storyEn) ? 'Story missing' : !s.location ? 'Region missing' : '';
  return [
    { key: 'payouts', label: 'Stripe payouts enabled', ok: p.payouts.enabled, state: p.payouts.enabled ? '' : 'Waiting for Stripe' },
    { key: 'identity', label: 'Trader identity verified', ok: legal.traderIdentity, state: legal.traderIdentity ? '' : 'Missing' },
    {
      key: 'dac7_lucid',
      label: 'DAC7 and LUCID data complete',
      ok: legal.taxReporting && legal.packaging,
      state: !legal.packaging ? 'LUCID missing' : !legal.taxReporting ? 'DAC7 missing' : '',
    },
    { key: 'food', label: 'Food and alcohol requirements met', ok: legal.foodAndDrinks, state: legal.foodAndDrinks ? '' : 'Missing' },
    { key: 'profile', label: 'Profile complete: logo, story, legal notice, policies', ok: !profileMissing, state: profileMissing },
    {
      key: 'product',
      label: 'At least one product approved',
      ok: products.approved > 0,
      state: products.approved > 0 ? '' : products.inReview > 0 ? 'In review' : 'None sent',
    },
    {
      key: 'shipping',
      label: sellsAlcohol(p) ? 'Age-checked shipping set up' : 'Shipping set up',
      ok: shippingComplete(p),
      state: shippingComplete(p) ? '' : 'Missing',
    },
  ];
}

export function readyToGoLive(p: VendorPanel) {
  return gateChecks(p).every((c) => c.ok);
}

/** The seven setup steps on the overview, in two groups. */
export function setupSteps(p: VendorPanel) {
  const legal = legalParts(p);
  const products = productCounts(p);
  const s = shopSections(p);
  const shopProfile: Chip = shopProfileComplete(p)
    ? { label: 'Done', tone: 'done' }
    : s.logoAndBanner || s.storyDe || s.location
      ? { label: 'In progress', tone: 'progress' }
      : { label: 'To do', tone: 'todo' };
  const productsChip: Chip =
    products.approved > 0
      ? { label: 'Done', tone: 'done' }
      : products.inReview > 0
        ? { label: 'Waiting for admin', tone: 'waiting' }
        : products.returned > 0
          ? { label: 'Returned', tone: 'todo' }
          : { label: 'To do', tone: 'todo' };
  const done = (ok: boolean): Chip => (ok ? { label: 'Done', tone: 'done' } : { label: 'To do', tone: 'todo' });
  const foodNote = [
    'Food business registration',
    p.business.categories.includes('spirits') ? 'alcohol tax status' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    shop: [
      { key: 'shop_profile', name: 'Shop profile', note: 'Logo, banner, story (DE and EN), region', chip: shopProfile, href: '/vendor/shop' },
      {
        key: 'products',
        name: 'Products',
        note: `At least one approved to go live${products.inReview ? ` · ${products.inReview} in review` : ''}`,
        chip: productsChip,
        href: '/vendor/products',
      },
    ],
    business: [
      {
        key: 'payouts',
        name: 'Payouts',
        note: 'Identity and bank account, on Stripe',
        chip: p.payouts.enabled ? ({ label: 'Done', tone: 'done' } as Chip) : ({ label: 'Waiting for Stripe', tone: 'waiting' } as Chip),
        href: '/vendor/payouts',
      },
      {
        key: 'identity_tax',
        name: 'Trader identity and tax data',
        note: 'ID, register extract, DAC7',
        chip: done(legal.traderIdentity && legal.taxReporting),
        href: '/vendor/legal',
      },
      { key: 'lucid', name: 'Packaging (LUCID)', note: 'Your LUCID registration number', chip: done(legal.packaging), href: '/vendor/legal#lucid' },
      {
        key: 'food',
        name: legal.alcohol ? 'Food and alcohol requirements' : 'Food requirements',
        note: foodNote,
        chip: done(legal.foodAndDrinks),
        href: '/vendor/legal#food',
      },
      {
        key: 'shipping',
        name: 'Shipping',
        note: legal.alcohol ? 'Options, costs, age-checked delivery' : 'Options and costs',
        chip: done(shippingComplete(p)),
        href: '/vendor/shipping',
      },
    ],
  };
}

export function setupProgress(p: VendorPanel) {
  const steps = setupSteps(p);
  const all = [...steps.shop, ...steps.business];
  return { done: all.filter((s) => s.chip.tone === 'done').length, total: all.length };
}

export type NavItem = { key: string; label: string; href: string; mark: Mark };

/** Sidebar entries with their status icon. */
export function navItems(p: VendorPanel): NavItem[] {
  const live = p.stage === 'live';
  const legal = legalParts(p);
  const products = productCounts(p);
  const m = (mark: Mark): Mark => (live ? 'none' : mark);
  const shopMark: Mark = shopProfileComplete(p) ? 'done' : 'progress';
  const productMark: Mark = products.approved > 0 ? 'done' : products.inReview > 0 ? 'waiting' : 'needs';
  const legalMark: Mark = legal.traderIdentity && legal.taxReporting && legal.packaging && legal.foodAndDrinks ? 'done' : 'needs';
  const goLiveMark: Mark = p.stage === 'submitted' ? 'waiting' : readyToGoLive(p) ? 'needs' : 'locked';

  const items: NavItem[] = [
    { key: 'overview', label: 'Overview', href: '/vendor', mark: 'none' },
    { key: 'shop', label: 'Shop page', href: '/vendor/shop', mark: m(shopMark) },
    { key: 'products', label: 'Products', href: '/vendor/products', mark: m(productMark) },
    ...(live ? [{ key: 'orders', label: 'Orders', href: '/vendor/orders', mark: 'none' as Mark }] : []),
    { key: 'payouts', label: 'Payouts', href: '/vendor/payouts', mark: m(p.payouts.enabled ? 'done' : 'waiting') },
    { key: 'legal', label: 'Legal and tax', href: '/vendor/legal', mark: m(legalMark) },
    { key: 'shipping', label: 'Shipping', href: '/vendor/shipping', mark: m(shippingComplete(p) ? 'done' : 'needs') },
    ...(live ? [] : [{ key: 'golive', label: 'Go live', href: '/vendor/go-live', mark: goLiveMark }]),
    { key: 'settings', label: 'Settings', href: '/vendor/settings', mark: 'none' },
  ];
  return items;
}

export function stageBadge(p: VendorPanel): { label: string; tone: 'warn' | 'good' | 'info' } {
  if (p.stage === 'live') return { label: 'Live', tone: 'good' };
  if (p.stage === 'submitted') return { label: 'Sent for final approval', tone: 'info' };
  if (readyToGoLive(p)) return { label: 'Ready for final approval', tone: 'good' };
  return { label: 'Onboarding · not visible yet', tone: 'warn' };
}

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  in_review: { label: 'In review', tone: 'warn' },
  returned: { label: 'Returned', tone: 'bad' },
  approved: { label: 'Approved', tone: 'good' },
  live: { label: 'Live', tone: 'good' },
};

export const PRODUCT_CATEGORIES: Record<Product['category'], string> = {
  spirits: 'Spirits',
  liqueur: 'Liqueur',
  beer: 'Beer',
  wine: 'Wine',
  food: 'Food',
  gift_set: 'Gift set',
};

/** "Gin · 0.5 l · 40% vol" */
export function productSummary(x: Product) {
  return [x.legalName || PRODUCT_CATEGORIES[x.category], x.netQuantity, x.abv ? `${x.abv}% vol` : ''].filter(Boolean).join(' · ');
}
