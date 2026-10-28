import type { ApplicationData } from '../vendors/application.schema.js';

/** Fictional applications. Every name, address, number and website here is invented (.example domains). */
export const FIXTURES: Array<{ key: string; colors: string[]; data: Omit<ApplicationData, 'products'> & { products: Omit<ApplicationData['products'], 'photoIds' | 'dataFileIds'> } }> = [
  {
    key: 'kellerwald',
    colors: ['#7a4b2a', '#c99a4e', '#3f5e3a'],
    data: {
      business: {
        type: 'sole_trader',
        legalName: 'Brennerei Kellerwald, Inh. Marta Hessler',
        shopName: 'Brennerei Kellerwald',
        country: 'DE',
        vatId: 'DE123456789',
        taxNumber: '',
        registerNumber: '',
        registerCourt: '',
        address: { street: 'Dorfstraße 12', postcode: '34596', city: 'Bad Zwesten' },
      },
      contact: {
        firstName: 'Marta',
        lastName: 'Hessler',
        role: 'Owner and distiller',
        email: 'hello@kellerwald-brennerei.example',
        phone: '+49 5626 123456',
        website: 'kellerwald-brennerei.example',
        socialLinks: '',
      },
      products: {
        categories: ['spirits'],
        makesOwnProducts: 'yes',
        story:
          'We are a family distillery in the Kellerwald hills. Since 1987 we distil fruit brandies from the apples, pears and ' +
          'plums of our own orchards, and since 2019 a dry gin with juniper and herbs we pick ourselves. Every batch is small, ' +
          'bottled by hand and numbered. We add no flavourings and no sugar.',
        productCount: '8',
        priceRange: '€24 to €58',
        whereSoldToday: 'Our farm shop and two regional markets in northern Hesse',
      },
      agreement: { plan: 'professional', acceptTerms: true, legalSelfCertification: true, language: 'en' },
    },
  },
  {
    key: 'collinaverde',
    colors: ['#5b1f2e', '#8c9a3c', '#d9c38a'],
    data: {
      business: {
        type: 'company',
        legalName: 'Cantina Collina Verde S.r.l.',
        shopName: 'Collina Verde',
        country: 'IT',
        vatId: 'IT01234567890',
        taxNumber: '',
        registerNumber: 'CN-123456',
        registerCourt: 'Cuneo',
        address: { street: 'Via delle Vigne 4', postcode: '12051', city: 'Alba' },
      },
      contact: {
        firstName: 'Giulia',
        lastName: 'Ferraro',
        role: 'Managing director',
        email: 'info@collinaverde.example',
        phone: '+39 0173 123456',
        website: 'collinaverde.example',
        socialLinks: '',
      },
      products: {
        categories: ['wine'],
        makesOwnProducts: 'yes',
        story:
          'Collina Verde is a family winery on the hills near Alba in Piedmont. We farm six hectares organically and harvest ' +
          'by hand. We make Barbera, Nebbiolo and a little Arneis, about 12,000 bottles a year, aged in our own cellar.',
        productCount: '6',
        priceRange: '€14 to €32',
        whereSoldToday: 'Cellar door and a few wine bars in Turin',
      },
      agreement: { plan: 'starter', acceptTerms: true, legalSelfCertification: true, language: 'en' },
    },
  },
  {
    key: 'globalspirits',
    colors: ['#1d3557', '#457b9d', '#a8dadc'],
    data: {
      business: {
        type: 'company',
        legalName: 'Global Spirits Trading Ltd',
        shopName: 'Global Spirits',
        country: 'GB',
        vatId: 'GB123456789',
        taxNumber: '',
        registerNumber: '01234567',
        registerCourt: 'Companies House',
        address: { street: '1 Dock Road', postcode: 'E16 2AA', city: 'London' },
      },
      contact: {
        firstName: 'Tom',
        lastName: 'Reed',
        role: 'Sales manager',
        email: 'sales@globalspirits-trading.example',
        phone: '+44 20 7946 0000',
        website: 'globalspirits-trading.example',
        socialLinks: '',
      },
      products: {
        categories: ['spirits'],
        makesOwnProducts: 'partly',
        story:
          'We import and distribute a wide range of spirits brands from around the world at competitive wholesale prices. ' +
          'Our portfolio covers whisky, gin, rum and liqueurs, and we can supply large volumes quickly.',
        productCount: '120',
        priceRange: '€9 to €40',
        whereSoldToday: 'UK supermarkets and wholesale',
      },
      agreement: { plan: 'professional', acceptTerms: true, legalSelfCertification: true, language: 'en' },
    },
  },
  {
    key: 'almwiese',
    colors: ['#6a994e', '#f2e8cf', '#bc4749'],
    data: {
      business: {
        type: 'small_business',
        legalName: 'Kräuterhof Almwiese, Anna Brandl',
        shopName: 'Kräuterhof Almwiese',
        country: 'DE',
        vatId: '',
        taxNumber: '141/234/56789',
        registerNumber: '',
        registerCourt: '',
        address: { street: 'Almweg 3', postcode: '82467', city: 'Garmisch-Partenkirchen' },
      },
      contact: {
        firstName: 'Anna',
        lastName: 'Brandl',
        role: 'Owner',
        email: 'anna@almwiese-kraeuterhof.example',
        phone: '+49 8821 98765',
        website: 'almwiese-kraeuterhof.example',
        socialLinks: 'instagram.com/almwiese.example',
      },
      products: {
        categories: ['food'],
        makesOwnProducts: 'yes',
        story:
          'On our mountain farm we grow and pick herbs by hand and turn them into syrups, herbal salts and teas in small batches. ' +
          'Elderflower, mountain mint and spruce tip are our favourites.',
        productCount: '14',
        priceRange: '€6 to €15',
        whereSoldToday: 'Farm shop, weekly market, and some Edeka stores in Bavaria',
      },
      agreement: { plan: 'starter', acceptTerms: true, legalSelfCertification: true, language: 'en' },
    },
  },
  {
    key: 'hopfenwerk',
    colors: ['#e09f3e', '#9e2a2b', '#335c67'],
    data: {
      business: {
        type: 'company',
        legalName: 'Hopfenwerk Nord GmbH',
        shopName: 'Hopfenwerk Nord',
        country: 'DE',
        vatId: 'DE987654321',
        taxNumber: '',
        registerNumber: 'HRB 123456',
        registerCourt: 'Hamburg',
        address: { street: 'Hafenstraße 8', postcode: '20457', city: 'Hamburg' },
      },
      contact: {
        firstName: 'Jonas',
        lastName: 'Petersen',
        role: 'Brewer',
        email: 'jonas@hopfenwerk-nord.example',
        // Same number as Brennerei Kellerwald: shows the duplicate check.
        phone: '+49 5626 123456',
        website: 'hopfenwerk-nord.example',
        socialLinks: '',
      },
      products: {
        categories: ['beer'],
        makesOwnProducts: 'yes',
        story: 'We brew craft beer in Hamburg. Pale ale, IPA and a seasonal stout. Good beer for good people, every day.',
        productCount: '5',
        priceRange: '€3 to €5',
        whereSoldToday: '',
      },
      agreement: { plan: 'starter', acceptTerms: true, legalSelfCertification: true, language: 'en' },
    },
  },
];
