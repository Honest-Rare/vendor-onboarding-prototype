import { z } from 'zod';

export const CATEGORIES = ['spirits', 'beer', 'wine', 'food'] as const;
export const PLANS = ['starter', 'professional'] as const;

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, label: string) => z.string().trim().min(1, `${label} is required`).max(max);

/** Stage 1 of the PRD: only what is needed to decide. No bank, ID or tax-ID data. */
export const applicationSchema = z
  .object({
    business: z.object({
      type: z.enum(['sole_trader', 'company', 'small_business']),
      legalName: required(200, 'Legal business name'),
      shopName: required(80, 'Shop name'),
      country: z.string().trim().length(2).transform((c) => c.toUpperCase()),
      vatId: text(20).default(''),
      taxNumber: text(30).default(''),
      registerNumber: text(40).default(''),
      registerCourt: text(80).default(''),
      address: z.object({
        street: required(120, 'Street'),
        postcode: required(12, 'Postcode'),
        city: required(80, 'City'),
      }),
    }),
    contact: z.object({
      firstName: required(80, 'First name'),
      lastName: required(80, 'Last name'),
      role: text(80).default(''),
      email: z.email('Enter a valid email'),
      phone: required(30, 'Phone'),
      website: text(300).default(''),
      socialLinks: text(500).default(''),
    }),
    products: z.object({
      categories: z.array(z.enum(CATEGORIES)).min(1, 'Choose at least one category'),
      makesOwnProducts: z.enum(['yes', 'partly', 'no']),
      story: z.string().trim().min(80, 'Tell us a bit more (at least 80 characters)').max(3000),
      photoIds: z.array(z.uuid()).min(3, 'Add at least 3 photos').max(5, 'Add at most 5 photos'),
      productCount: required(40, 'Number of products'),
      priceRange: required(40, 'Price range'),
      whereSoldToday: text(500).default(''),
    }),
    agreement: z.object({
      plan: z.enum(PLANS),
      acceptTerms: z.literal(true, { error: 'Please accept the vendor terms and privacy policy' }),
      legalSelfCertification: z.literal(true, { error: 'Please confirm you may legally sell these products' }),
      language: z.enum(['en', 'de']).default('en'),
    }),
  })
  .superRefine((value, ctx) => {
    const b = value.business;
    if (b.type === 'small_business') {
      if (!b.vatId && !b.taxNumber) {
        ctx.addIssue({ code: 'custom', path: ['business', 'taxNumber'], message: 'Enter your VAT ID or tax number' });
      }
    } else if (!b.vatId) {
      ctx.addIssue({ code: 'custom', path: ['business', 'vatId'], message: 'VAT ID is required' });
    }
    if (b.type === 'company' && !b.registerNumber) {
      ctx.addIssue({ code: 'custom', path: ['business', 'registerNumber'], message: 'Register number is required for companies' });
    }
    if (!value.contact.website && !value.contact.socialLinks) {
      ctx.addIssue({ code: 'custom', path: ['contact', 'website'], message: 'Give a website or at least one social media link' });
    }
  });

export type ApplicationData = z.infer<typeof applicationSchema>;
