import type { FieldDef, Section } from '../sections';

/**
 * Setup sections an admin checks before a vendor goes live. Ported from the former API's
 * `sections.config.ts` (see git tag `backend-prototype`).
 *
 * "First product" keeps only the fields the admin needs to recognise the product: the full product form
 * now lives in the vendor panel and every product is reviewed on its own.
 */
type SectionDef = Pick<Section, 'key' | 'title' | 'reviewer' | 'requiredBefore' | 'fields'> & {
  /** Only for vendors approved for one of these categories. */
  onlyFor?: string[];
};

const t = (key: string, label: string, required = true, type: FieldDef['type'] = 'text'): FieldDef => ({ key, label, type, required });

export const SECTION_DEFS: SectionDef[] = [
  { key: 'payouts', title: 'Payouts', reviewer: 'stripe', requiredBefore: 'go_live', fields: [] },
  {
    key: 'trader_identity',
    title: 'Business verification',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    fields: [
      t('representative_name', 'Legal representative'),
      t('representative_role', 'Their role'),
      t('registration_document', 'Trade register extract or business registration (Gewerbeanmeldung)', true, 'document'),
    ],
  },
  {
    key: 'contacts',
    title: 'Contact emails',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    fields: [
      t('orders_email', 'Email for new orders', false, 'email'),
      t('team_email', 'Email for messages from Honest & Rare', false, 'email'),
      t('invoices_email', 'Email for invoices', false, 'email'),
    ],
  },
  {
    key: 'tax',
    title: 'Tax reporting',
    reviewer: 'admin',
    requiredBefore: 'first_payout',
    fields: [
      t('tax_id', 'Tax identification number'),
      t('tax_country', 'Country that issued it'),
      t('date_of_birth', 'Date of birth', true, 'date'),
      t('eu_establishments', 'Permanent establishments in other EU countries', false, 'textarea'),
    ],
  },
  { key: 'packaging', title: 'Packaging registration', reviewer: 'admin', requiredBefore: 'go_live', fields: [t('lucid_number', 'LUCID registration number')] },
  {
    key: 'food_registration',
    title: 'Food business registration',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    fields: [
      t('authority', 'Registered with (authority)'),
      t('reference', 'Registration reference', false),
      t('document', 'Registration confirmation', false, 'document'),
      t('organic_body', 'Organic certification body code', false),
    ],
  },
  {
    key: 'alcohol_tax',
    title: 'Alcohol tax',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    onlyFor: ['spirits'],
    fields: [
      {
        key: 'tax_status',
        label: 'Alcohol tax status',
        type: 'select',
        required: true,
        options: [
          { value: 'tax_paid', label: 'My spirits are taxed (tax-paid goods)' },
          { value: 'bonded', label: 'I run a bonded warehouse (Steuerlager)' },
        ],
      },
      t('customs_reference', 'Customs reference (Zoll)', false),
      t('germany_only', 'I understand spirits are delivered within Germany only at launch', true, 'checkbox'),
    ],
  },
  {
    key: 'shipping',
    title: 'Shipping and returns',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    fields: [
      t('dispatch_address', 'Dispatch address', false, 'textarea'),
      t('returns_address', 'Returns address', true, 'textarea'),
      t('processing_days', 'Days to dispatch', true, 'number'),
      t('shipping_zones', 'Shipping countries and costs', true, 'textarea'),
      {
        key: 'age_checked_delivery',
        label: 'Age-checked delivery',
        type: 'select',
        required: true,
        options: [
          { value: 'dhl_ident', label: 'DHL age check on delivery' },
          { value: 'other', label: 'Other carrier with age check' },
        ],
      },
    ],
  },
  {
    key: 'shop_profile',
    title: 'Shop profile',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    fields: [
      t('about', 'About you and how you make your products', true, 'textarea'),
      t('region', 'Location and region'),
      t('logo', 'Logo', true, 'document'),
      t('banner', 'Banner image', true, 'document'),
    ],
  },
  {
    key: 'first_product',
    title: 'First product',
    reviewer: 'admin',
    requiredBefore: 'go_live',
    fields: [
      t('name', 'Product name'),
      t('legal_name', 'Legal product name'),
      {
        key: 'product_type',
        label: 'Product type',
        type: 'select',
        required: true,
        options: [
          { value: 'spirits', label: 'Spirits' },
          { value: 'beer', label: 'Beer' },
          { value: 'wine', label: 'Wine' },
          { value: 'food', label: 'Food or non-alcoholic drink' },
        ],
      },
      t('price', 'Price incl. VAT, without deposit (EUR)'),
    ],
  },
];

export type AdminVendor = {
  vendor: {
    id: string;
    shopName: string;
    status: 'onboarding' | 'ready' | 'live';
    createdAt: string;
    liveAt: string | null;
    stripeAccountId: string | null;
    legalName: string;
    vatId: string | null;
    taxNumber: string | null;
    address: { street: string | null; postcode: string | null; city: string | null; country: string };
    slug: string;
    preModeration: boolean;
  };
  application: { id: string; legalName: string; email: string; country: string; categories: string[] };
  sections: Section[];
  events: Array<{
    subject_type: string;
    from_status: string | null;
    to_status: string | null;
    actor: string;
    reason: string | null;
    meta: any;
    created_at: string;
  }>;
};

type SectionState = Partial<Pick<Section, 'status' | 'adminNote' | 'data' | 'files'>>;

export function buildSections(categories: string[], states: Record<string, SectionState>, at: string): Section[] {
  return SECTION_DEFS.filter((d) => !d.onlyFor || d.onlyFor.some((c) => categories.includes(c))).map((d) => ({
    key: d.key,
    title: d.title,
    description: '',
    reviewer: d.reviewer,
    requiredBefore: d.requiredBefore,
    fields: d.fields,
    status: 'not_started',
    adminNote: null,
    updatedAt: at,
    reviewedAt: null,
    data: {},
    files: [],
    ...states[d.key],
  }));
}

const doc = (id: string) => ({ id, name: id, mimeType: 'application/pdf' });

export function adminVendorFixtures(ago: (days: number) => string): AdminVendor[] {
  return [
    {
      vendor: {
        id: 'vendor-kellerwald',
        shopName: 'Brennerei Kellerwald',
        status: 'onboarding',
        createdAt: ago(2),
        liveAt: null,
        stripeAccountId: 'acct_sim_kellerwald',
        legalName: 'Brennerei Kellerwald, Inh. Marta Hessler',
        vatId: 'DE123456789',
        taxNumber: null,
        address: { street: 'Dorfstraße 12', postcode: '34596', city: 'Bad Zwesten', country: 'DE' },
        slug: 'brennerei-kellerwald',
        preModeration: true,
      },
      application: {
        id: 'app-kellerwald',
        legalName: 'Brennerei Kellerwald, Inh. Marta Hessler',
        email: 'hello@kellerwald-brennerei.example',
        country: 'DE',
        categories: ['spirits'],
      },
      sections: buildSections(
        ['spirits'],
        {
          payouts: { status: 'approved' },
          trader_identity: {
            status: 'approved',
            data: { representative_name: 'Marta Hessler', representative_role: 'Owner', registration_document: 'handelsregister-auszug.pdf' },
            files: [doc('handelsregister-auszug.pdf')],
          },
          contacts: { status: 'submitted', data: { orders_email: 'orders@kellerwald-brennerei.example' } },
          packaging: {
            status: 'changes_requested',
            data: { lucid_number: '1234567890123' },
            adminNote: 'The LUCID number should start with DE. Please check it in the LUCID register.',
          },
          food_registration: {
            status: 'approved',
            data: { authority: '[Local food authority]', document: 'lebensmittelbetrieb-registrierung.pdf' },
            files: [doc('lebensmittelbetrieb-registrierung.pdf')],
          },
          alcohol_tax: { status: 'submitted', data: { tax_status: 'tax_paid', germany_only: true } },
          shipping: {
            status: 'submitted',
            data: {
              returns_address: 'Dorfstraße 12, 34596 Bad Zwesten',
              processing_days: 2,
              shipping_zones: 'Germany: [YOUR SHIPPING COST]',
              age_checked_delivery: 'dhl_ident',
            },
          },
          first_product: {
            status: 'changes_requested',
            data: { name: 'Heide-Gin', legal_name: 'Gin', product_type: 'spirits', price: '[PRICE]' },
            adminNote: 'Please add a back-label photo so we can check the allergen information.',
          },
        },
        ago(1),
      ),
      events: [
        {
          subject_type: 'section',
          from_status: 'submitted',
          to_status: 'changes_requested',
          actor: 'admin',
          reason: 'The LUCID number should start with DE. Please check it in the LUCID register.',
          meta: { key: 'packaging' },
          created_at: ago(0),
        },
        { subject_type: 'section', from_status: 'not_started', to_status: 'submitted', actor: 'vendor', reason: null, meta: { key: 'shipping' }, created_at: ago(1) },
        { subject_type: 'section', from_status: 'not_started', to_status: 'approved', actor: 'stripe', reason: null, meta: { key: 'payouts' }, created_at: ago(1) },
        { subject_type: 'vendor', from_status: null, to_status: 'onboarding', actor: 'admin', reason: null, meta: null, created_at: ago(2) },
      ],
    },
    {
      vendor: {
        id: 'vendor-collina-verde',
        shopName: 'Collina Verde',
        status: 'ready',
        createdAt: ago(2),
        liveAt: null,
        stripeAccountId: 'acct_sim_collina',
        legalName: 'Cantina Collina Verde S.r.l.',
        vatId: 'IT01234567890',
        taxNumber: null,
        address: { street: 'Via delle Vigne 4', postcode: '53024', city: 'Montalcino', country: 'IT' },
        slug: 'collina-verde',
        preModeration: true,
      },
      application: {
        id: 'app-collina-verde',
        legalName: 'Cantina Collina Verde S.r.l.',
        email: 'info@collinaverde.example',
        country: 'IT',
        categories: ['wine'],
      },
      sections: buildSections(
        ['wine'],
        {
          payouts: { status: 'approved' },
          trader_identity: {
            status: 'approved',
            data: { representative_name: 'Giulia Ferri', representative_role: 'Managing director', registration_document: 'handelsregister-auszug.pdf' },
            files: [doc('handelsregister-auszug.pdf')],
          },
          contacts: { status: 'approved', data: { orders_email: 'ordini@collinaverde.example', team_email: 'info@collinaverde.example' } },
          packaging: { status: 'approved', data: { lucid_number: 'DE4012345678901' } },
          food_registration: {
            status: 'approved',
            data: { authority: '[Local food authority]', document: 'lebensmittelbetrieb-registrierung.pdf' },
            files: [doc('lebensmittelbetrieb-registrierung.pdf')],
          },
          shipping: {
            status: 'approved',
            data: { returns_address: 'Via delle Vigne 4, 53024 Montalcino', processing_days: 3, shipping_zones: 'Germany: [YOUR SHIPPING COST]', age_checked_delivery: 'dhl_ident' },
          },
          shop_profile: { status: 'approved', data: { about: '[Story]', region: 'Montalcino, Tuscany', logo: 'logo.png', banner: 'banner.jpg' }, files: [doc('logo.png'), doc('banner.jpg')] },
          first_product: { status: 'approved', data: { name: '[Product name]', legal_name: 'Red wine', product_type: 'wine', price: '[PRICE]' } },
        },
        ago(1),
      ),
      events: [
        { subject_type: 'vendor', from_status: 'onboarding', to_status: 'ready', actor: 'system', reason: null, meta: null, created_at: ago(0) },
        { subject_type: 'vendor', from_status: null, to_status: 'onboarding', actor: 'admin', reason: null, meta: null, created_at: ago(2) },
      ],
    },
  ];
}
