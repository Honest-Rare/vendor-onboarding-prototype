export const SCREENING_PROVIDER = Symbol('SCREENING_PROVIDER');

/** What the AI sees. Never bank, ID or tax data. */
export interface ScreeningInput {
  applicationId: string;
  fixture?: string;
  shopName: string;
  legalName: string;
  country: string;
  categories: string[];
  makesOwnProducts: 'yes' | 'partly' | 'no';
  story: string;
  website: string;
  socialLinks: string;
  whereSoldToday: string;
  productCount: string;
  priceRange: string;
  photoCount: number;
}

export type Criterion = 'regional' | 'not_mainstream' | 'quality' | 'natural';
export type Assessment = 'evidence_found' | 'concerns_found' | 'no_information';

export interface ScreeningResult {
  provider: string;
  model: string;
  promptVersion: string;
  simulated: boolean;
  /** Advice only. The admin decides. */
  recommendation: 'approve' | 'needs_a_look' | 'likely_reject';
  /** 0..1, or null when the provider could not judge. Used only to order the queue. */
  confidence: number | null;
  summary: string;
  criteria: Array<{ criterion: Criterion; assessment: Assessment; note: string; source?: string }>;
  flags: Array<{ severity: 'info' | 'warning' | 'critical'; title: string; detail: string; source?: string }>;
  sourcesChecked: string[];
  suggestedQuestion?: string;
}

export interface ScreeningProvider {
  screen(input: ScreeningInput): Promise<ScreeningResult>;
}
