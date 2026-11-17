import type { Product, VendorPanel } from '../vendor-panel';

/**
 * Brennerei Kellerwald in the vendor panel, in the three states the designs show:
 * - `onboarding`: part-way through setup (design "1 · Overview (before go-live)")
 * - `ready`: every automatic check passes (design "8 · Go live")
 * - `live`: after go-live (design "9 · Overview after go-live")
 *
 * Values still open in the PRD stay as [brackets].
 */
export type PrototypeState = 'onboarding' | 'ready' | 'live';

const product = (p: Partial<Product> & Pick<Product, 'id' | 'name' | 'status' | 'category'>): Product => ({
  sentAt: null,
  note: null,
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
  countryOfOrigin: 'Germany',
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
  ...p,
});

export function vendorPanelFixture(state: PrototypeState, ago: (days: number) => string): VendorPanel {
  const panel: VendorPanel = {
    stage: 'onboarding',
    account: { firstName: 'Marta', email: 'hello@kellerwald-brennerei.example', passwordSetAt: ago(2), twoFactor: false, language: 'de' },
    business: {
      legalName: 'Brennerei Kellerwald, Inh. Marta Hessler',
      address: 'Dorfstraße 12, 34596 Bad Zwesten',
      categories: ['spirits', 'food'],
    },
    shop: {
      name: 'Brennerei Kellerwald',
      logo: 'logo.png',
      banner: 'banner.jpg',
      workshopPhotos: [],
      storyDe:
        'Wir sind eine Familienbrennerei im Kellerwald. Seit 1987 brennen wir Obstbrände aus Äpfeln, Birnen und Zwetschgen ' +
        'unserer eigenen Streuobstwiesen, seit 2019 auch einen trockenen Gin mit Wacholder und Kräutern, die wir selbst sammeln. ' +
        'Jede Charge ist klein, von Hand abgefüllt und nummeriert. Wir setzen keine Aromen und keinen Zucker zu.',
      storyEn: '',
      town: 'Bad Zwesten, Kellerwald (northern Hesse)',
      links: 'https://kellerwald-brennerei.example',
      emailLogo: null,
      favicon: null,
      seoTitle: 'Brennerei Kellerwald · fruit brandies and gin from northern Hesse',
      seoDescription: '',
      analyticsId: '',
      pixelId: '',
    },
    products: [
      product({
        id: 'p-heide-gin',
        name: 'Heide-Gin',
        status: 'in_review',
        sentAt: ago(1),
        category: 'spirits',
        description: 'Trockener Gin mit Wacholder und Heidekraut aus dem Kellerwald.',
        photos: ['first-product-heidegin.jpg'],
        price: '34.00',
        stock: '120',
        weightAndSize: '1.2 kg, 8 × 8 × 25 cm',
        legalName: 'Gin',
        netQuantity: '0.5 l',
        abv: '40',
        minAge: '18',
        ageWarning: 'No sale to persons under 18',
        allergens: 'None',
        attributes: { botanicals: 'Juniper, heather', style: 'London Dry' },
      }),
      product({
        id: 'p-likoer',
        name: 'Zwetschgenlikör',
        status: 'in_review',
        sentAt: ago(1),
        category: 'liqueur',
        photos: ['kellerwald-02.jpg'],
        price: '22.00',
        stock: '80',
        legalName: 'Liqueur',
        netQuantity: '0.35 l',
        abv: '25',
        minAge: '18',
        allergens: 'None',
      }),
      product({
        id: 'p-aufstrich',
        name: 'Mirabellen-Fruchtaufstrich',
        status: 'returned',
        sentAt: ago(2),
        note: 'Allergens missing from the ingredients list',
        category: 'food',
        photos: ['kellerwald-03.jpg'],
        price: '6.50',
        vatRate: '7',
        legalName: 'Fruit spread',
        netQuantity: '220 g',
        storage: 'Refrigerate after opening',
        bestBefore: '',
      }),
      product({ id: 'p-geschenkset', name: 'Gin-Geschenkset', status: 'draft', category: 'gift_set', legalName: 'Gin gift set' }),
    ],
    payouts: {
      enabled: false,
      requirement: 'Proof of address for the legal representative, for example a recent utility bill',
      checks: [
        { key: 'business', label: 'Business details', note: 'Name, address, VAT ID', status: 'done' },
        { key: 'representative', label: 'Legal representative', note: 'Name, date of birth, address, ID', status: 'needs_document' },
        { key: 'owners', label: 'Owners above 25% and directors', note: 'Companies only', status: 'done' },
        { key: 'bank', label: 'Bank account (IBAN)', note: 'Where your payouts go', status: 'done' },
        { key: 'descriptor', label: 'Statement descriptor', note: 'The name customers see on their bank statement', status: 'done' },
      ],
      invoiceEmail: '',
      accountingContactId: '[Lexoffice contact ID]',
    },
    legal: {
      idVerifiedByStripe: true,
      registerExtract: { id: 'handelsregister-auszug.pdf', name: 'handelsregister-auszug.pdf', uploadedAt: ago(2) },
      taxId: '[Tax ID]',
      taxCountry: 'DE',
      dateOfBirth: '',
      otherEstablishments: false,
      lucidNumber: '',
      foodRegistration: { id: 'lebensmittelbetrieb-registrierung.pdf', name: 'lebensmittelbetrieb-registrierung.pdf', uploadedAt: ago(2) },
      alcoholTaxStatus: 'tax_paid',
      taxRepresentative: '',
      organicCertificate: null,
      otherCertificates: [],
    },
    shipping: {
      dispatchSameAsBusiness: true,
      dispatchAddress: '',
      returnsAddress: 'Dorfstraße 12, 34596 Bad Zwesten',
      options: [
        { id: 'o1', zone: 'Germany', option: 'Standard', cost: '[cost]', deliveryTime: '[X–Y] days', freeFrom: '[amount]' },
        { id: 'o2', zone: 'Germany', option: 'Age-checked delivery (alcohol)', cost: '[cost]', deliveryTime: '[X–Y] days', freeFrom: '' },
        { id: 'o3', zone: '[EU zone]', option: 'Standard', cost: '[cost]', deliveryTime: '[X–Y] days', freeFrom: '' },
      ],
      ageCheck16: true,
      ageCheck18: true,
      pickupPoints: [{ id: 'pp1', name: 'Hofladen Brennerei Kellerwald', address: 'Dorfstraße 12, 34596 Bad Zwesten', hours: '[opening hours]' }],
      processingDays: '2',
      minimumOrder: '',
      closures: '',
    },
    liveTasks: [],
  };

  if (state === 'onboarding') return panel;

  // Every automatic check passes.
  panel.shop.storyEn =
    'We are a family distillery in the Kellerwald hills. Since 1987 we distil fruit brandies from the apples, pears and plums ' +
    'of our own orchards, and since 2019 a dry gin with juniper and herbs we pick ourselves.';
  panel.payouts.enabled = true;
  panel.payouts.requirement = null;
  panel.payouts.checks = panel.payouts.checks.map((c) => ({ ...c, status: 'done' }));
  panel.legal.lucidNumber = 'DE1234567890123';
  panel.products[0].status = 'approved';

  if (state === 'ready') return panel;

  panel.stage = 'live';
  panel.products[0].status = 'live';
  panel.legal.organicCertificate = { id: 'organic-certificate.pdf', name: 'organic-certificate.pdf', uploadedAt: ago(300) };
  panel.liveTasks = [
    {
      id: 't1',
      kind: 'expires',
      title: 'Organic certificate expires on [date]',
      detail: 'Upload the renewed certificate, or organic products are hidden on that date.',
      action: 'Upload certificate',
      href: '/vendor/legal#food',
    },
    {
      id: 't2',
      kind: 'in_review',
      title: 'Your updated story is being checked',
      detail: 'Customers see the previous version until Honest & Rare approves the change.',
      action: 'See change',
      href: '/vendor/shop',
    },
    {
      id: 't3',
      kind: 'yearly',
      title: 'Confirm your tax data (DAC7) by [date]',
      detail: 'Check that your tax ID and address are still correct.',
      action: 'Confirm data',
      href: '/vendor/legal#tax',
    },
  ];
  return panel;
}
