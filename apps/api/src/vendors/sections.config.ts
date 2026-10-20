// Setup sections after approval, defined as data. Adding a requirement = adding an entry here.
// Each section ends with a check: by an admin (final admin check) or by Stripe (payouts).

export interface SectionContext {
  categories: string[];
  alcohol: boolean;
  spirits: boolean;
  businessType: 'sole_trader' | 'company' | 'small_business';
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'document';
  required: boolean;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  when?: (ctx: SectionContext) => boolean;
}

export interface SectionDef {
  key: string;
  title: string;
  description: string;
  reviewer: 'admin' | 'stripe';
  appliesTo: (ctx: SectionContext) => boolean;
  fields: FieldDef[];
}

const always = () => true;

export const SECTIONS: SectionDef[] = [
  {
    key: 'payouts',
    title: 'Payouts',
    description: 'Verify your identity and add your bank account on Stripe\'s secure pages. We never see your bank details.',
    reviewer: 'stripe',
    appliesTo: always,
    fields: [],
  },
  {
    key: 'trader_identity',
    title: 'Business verification',
    description: 'EU marketplaces must verify who they work with (Digital Services Act, Art. 30).',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'representative_name', label: 'Legal representative', type: 'text', required: true },
      { key: 'representative_role', label: 'Their role', type: 'text', required: true, help: 'For example owner or managing director' },
      {
        key: 'registration_document',
        label: 'Trade register extract or business registration (Gewerbeanmeldung)',
        type: 'document',
        required: true,
      },
    ],
  },
  {
    key: 'tax',
    title: 'Tax reporting',
    description: 'Marketplaces report seller data to the tax office once a year (DAC7).',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'tax_id', label: 'Tax identification number', type: 'text', required: true, help: 'German Steuer-ID or Steuernummer, or your country\'s TIN' },
      { key: 'tax_country', label: 'Country that issued it', type: 'text', required: true },
      {
        key: 'date_of_birth',
        label: 'Date of birth',
        type: 'date',
        required: true,
        when: (ctx) => ctx.businessType !== 'company',
      },
      { key: 'eu_establishments', label: 'Permanent establishments in other EU countries', type: 'textarea', required: false, help: 'Leave empty if none' },
    ],
  },
  {
    key: 'packaging',
    title: 'Packaging registration',
    description: 'Sellers shipping packaged goods to Germany must be registered in LUCID (VerpackG).',
    reviewer: 'admin',
    appliesTo: always,
    fields: [{ key: 'lucid_number', label: 'LUCID registration number', type: 'text', required: true, help: 'Starts with DE, for example DE1234567890123' }],
  },
  {
    key: 'food_registration',
    title: 'Food business registration',
    description: 'All food and drinks producers must be registered with their local food authority.',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'authority', label: 'Registered with (authority)', type: 'text', required: true },
      { key: 'reference', label: 'Registration reference', type: 'text', required: false },
      { key: 'document', label: 'Registration confirmation', type: 'document', required: false },
      { key: 'organic_body', label: 'Organic certification body code', type: 'text', required: false, help: 'Only if you call products organic, for example DE-ÖKO-006' },
    ],
  },
  {
    key: 'alcohol_tax',
    title: 'Alcohol tax',
    description: 'Spirits sellers must sell tax-paid goods. At launch, spirits are delivered within Germany only.',
    reviewer: 'admin',
    appliesTo: (ctx) => ctx.spirits,
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
      { key: 'customs_reference', label: 'Customs reference (Zoll)', type: 'text', required: false },
      { key: 'germany_only', label: 'I understand spirits are delivered within Germany only at launch', type: 'checkbox', required: true },
    ],
  },
  {
    key: 'shipping',
    title: 'Shipping and returns',
    description: 'How and where you ship, and where returns go.',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'dispatch_address', label: 'Dispatch address', type: 'textarea', required: false, help: 'Only if different from your business address' },
      { key: 'returns_address', label: 'Returns address', type: 'textarea', required: true },
      { key: 'processing_days', label: 'Days to dispatch', type: 'number', required: true },
      { key: 'shipping_zones', label: 'Shipping countries and costs', type: 'textarea', required: true },
      {
        key: 'age_checked_delivery',
        label: 'Age-checked delivery',
        type: 'select',
        required: true,
        when: (ctx) => ctx.alcohol,
        options: [
          { value: 'dhl_ident', label: 'DHL age check on delivery' },
          { value: 'other', label: 'Other carrier with age check' },
        ],
        help: '16+ for beer and wine, 18+ for spirits',
      },
    ],
  },
  {
    key: 'shop_profile',
    title: 'Shop profile',
    description: 'What customers see on your shop page.',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'about', label: 'About you and how you make your products', type: 'textarea', required: true },
      { key: 'region', label: 'Location and region', type: 'text', required: true },
      { key: 'logo', label: 'Logo', type: 'document', required: true },
      { key: 'banner', label: 'Banner image', type: 'document', required: true },
      { key: 'legal_notice', label: 'Legal notice (Impressum)', type: 'textarea', required: true },
      { key: 'withdrawal_policy', label: 'Right of withdrawal and returns policy', type: 'textarea', required: true },
    ],
  },
  {
    key: 'first_product',
    title: 'First product',
    description: 'Add one product. Our team checks it before your shop goes live.',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'name', label: 'Product name', type: 'text', required: true },
      { key: 'legal_name', label: 'Legal product name', type: 'text', required: true, help: 'For example "Gin", "Riesling", "Herbal syrup"' },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'net_quantity', label: 'Net quantity', type: 'text', required: true, help: 'For example 0.5 l or 250 g' },
      { key: 'abv', label: 'Alcohol by volume (%)', type: 'number', required: true, when: (ctx) => ctx.alcohol },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea', required: false, help: 'Required for food; optional for spirits' },
      { key: 'allergens', label: 'Allergens', type: 'text', required: true, help: 'Write "none" if there are none' },
      { key: 'price', label: 'Price incl. VAT (EUR)', type: 'number', required: true },
      { key: 'photo', label: 'Product photo', type: 'document', required: true },
    ],
  },
];

export function sectionsFor(ctx: SectionContext): SectionDef[] {
  return SECTIONS.filter((s) => s.appliesTo(ctx));
}

export function sectionDef(key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

/** Field definitions as sent to the vendor panel (functions removed, conditional fields resolved). */
export function visibleFields(def: SectionDef, ctx: SectionContext) {
  return def.fields
    .filter((f) => !f.when || f.when(ctx))
    .map(({ when: _when, ...field }) => field);
}
