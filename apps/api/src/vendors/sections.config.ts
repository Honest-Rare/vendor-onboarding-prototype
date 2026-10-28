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
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'document' | 'email';
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
  /** Sections are needed before go-live unless set. "first_payout" sections stay out of the go-live gate. */
  requiredBefore?: 'first_payout';
  fields: FieldDef[];
  /** Checks across fields, run when the vendor sends the section for review. Returns one message per problem. */
  validate?: (data: Record<string, unknown>, ctx: SectionContext) => Array<{ field: string; message: string }>;
}

const always = () => true;

const toNumber = (value: unknown) => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return String(value ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
};

const ALCOHOL_TYPES = ['spirits', 'beer', 'wine'];

/** Legal checks on the first product (LMIV, PAngV, JuSchG). */
function validateFirstProduct(data: Record<string, unknown>, ctx: SectionContext) {
  const errors: Array<{ field: string; message: string }> = [];
  const type = data.product_type as string | null;
  if (type && !ctx.categories.includes(type)) {
    errors.push({ field: 'Product type', message: 'Choose a product type from the categories in your application' });
  }
  if (type && ALCOHOL_TYPES.includes(type) && toNumber(data.abv) === null) {
    errors.push({ field: 'Alcohol by volume (%)', message: 'Alcohol by volume is required for beer, wine and spirits' });
  }
  if (type === 'food' || type === 'wine') {
    if (!data.ingredients) errors.push({ field: 'Ingredients', message: 'Ingredients are required for food and wine' });
    if (!data.nutrition) errors.push({ field: 'Nutrition declaration or e-label link', message: 'A nutrition declaration or e-label link is required for food and wine' });
  }
  if (type === 'spirits' && data.min_age !== '18') {
    errors.push({ field: 'Minimum age', message: 'Spirits can only be sold to customers aged 18 or over' });
  }
  if ((type === 'beer' || type === 'wine') && data.min_age === 'none') {
    errors.push({ field: 'Minimum age', message: 'Beer and wine can only be sold to customers aged 16 or over' });
  }

  // Unit price (Grundpreis) per 1 l or 1 kg must match price ÷ net quantity, to the cent.
  const price = toNumber(data.price);
  const quantity = toNumber(data.net_quantity);
  const unitPrice = toNumber(data.unit_price);
  const perUnit: Record<string, number> = { ml: 1000, l: 1, g: 1000, kg: 1 };
  const divisor = perUnit[data.net_unit as string];
  if (price !== null && quantity !== null && quantity > 0 && unitPrice !== null && divisor) {
    const expected = price / (quantity / divisor);
    if (Math.abs(expected - unitPrice) > 0.01) {
      const unit = data.net_unit === 'ml' || data.net_unit === 'l' ? 'litre' : 'kilo';
      errors.push({
        field: 'Price per litre or kilo (EUR)',
        message: `Price per ${unit} should be ${expected.toFixed(2)} EUR (price ÷ net quantity)`,
      });
    }
  }
  return errors;
}

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
    key: 'contacts',
    title: 'Contact emails',
    description: 'Where we send new orders, messages from our team and invoices. Leave a field empty to use your login email.',
    reviewer: 'admin',
    appliesTo: always,
    fields: [
      { key: 'orders_email', label: 'Email for new orders', type: 'email', required: false },
      { key: 'team_email', label: 'Email for messages from Honest & Rare', type: 'email', required: false },
      { key: 'invoices_email', label: 'Email for invoices', type: 'email', required: false },
    ],
  },
  {
    key: 'tax',
    title: 'Tax reporting',
    description: 'Marketplaces report seller data to the tax office once a year (DAC7).',
    reviewer: 'admin',
    appliesTo: always,
    // Asked step by step: not needed to go live, only before the first payout.
    requiredBefore: 'first_payout',
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
      { key: 'terms', label: 'Terms and conditions (AGB)', type: 'textarea', required: true },
      { key: 'privacy_notice', label: 'Privacy notice (Datenschutzerklärung)', type: 'textarea', required: true },
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
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'net_quantity', label: 'Net quantity', type: 'number', required: true, help: 'The number only, for example 0.5' },
      {
        key: 'net_unit',
        label: 'Unit',
        type: 'select',
        required: true,
        options: [
          { value: 'ml', label: 'ml' },
          { value: 'l', label: 'l' },
          { value: 'g', label: 'g' },
          { value: 'kg', label: 'kg' },
        ],
      },
      {
        key: 'abv',
        label: 'Alcohol by volume (%)',
        type: 'number',
        required: false,
        help: 'Required for beer, wine and spirits',
        when: (ctx) => ctx.alcohol,
      },
      {
        key: 'min_age',
        label: 'Minimum age',
        type: 'select',
        required: true,
        options: [
          { value: 'none', label: 'No age limit' },
          { value: '16', label: '16+' },
          { value: '18', label: '18+' },
        ],
        help: '16+ for beer and wine, 18+ for spirits',
      },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea', required: false, help: 'Required for food and for wine made from 8 December 2023' },
      {
        key: 'nutrition',
        label: 'Nutrition declaration or e-label link',
        type: 'textarea',
        required: false,
        help: 'Required for food and for wine made from 8 December 2023',
      },
      { key: 'allergens', label: 'Allergens', type: 'text', required: true, help: 'Required for every product, beer and spirits included. Write "none" if there are none' },
      {
        key: 'operator_name',
        label: 'Food business operator',
        type: 'text',
        required: true,
        help: 'The business responsible for the product, as named on the label. This can differ from the brand.',
      },
      { key: 'operator_address', label: 'Food business operator address', type: 'textarea', required: true },
      { key: 'price', label: 'Price incl. VAT, without deposit (EUR)', type: 'number', required: true },
      { key: 'unit_price', label: 'Price per litre or kilo (EUR)', type: 'number', required: true, help: 'Grundpreis: price ÷ net quantity, per 1 l or 1 kg' },
      {
        key: 'vat_rate',
        label: 'VAT rate',
        type: 'select',
        required: true,
        options: [
          { value: '19', label: '19 %' },
          { value: '7', label: '7 % (most food)' },
        ],
      },
      { key: 'deposit', label: 'Deposit (Pfand, EUR)', type: 'number', required: false, help: 'For example 0.08 or 0.25. Leave empty if there is none.' },
      { key: 'photo', label: 'Product photo', type: 'document', required: true },
    ],
    validate: validateFirstProduct,
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
