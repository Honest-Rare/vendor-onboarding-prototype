export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

export const APPLICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  email_unconfirmed: { label: 'Email not confirmed', tone: 'neutral' },
  submitted: { label: 'Checks running', tone: 'info' },
  in_review: { label: 'In review', tone: 'info' },
  needs_info: { label: 'Waiting for applicant', tone: 'warn' },
  approved: { label: 'Approved', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
  expired: { label: 'Expired', tone: 'neutral' },
};

export const SECTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  submitted: { label: 'Waiting for review', tone: 'info' },
  approved: { label: 'Approved', tone: 'good' },
  changes_requested: { label: 'Changes requested', tone: 'warn' },
};

export const VENDOR_STATUS: Record<string, { label: string; tone: Tone }> = {
  onboarding: { label: 'Setting up', tone: 'info' },
  ready: { label: 'Ready to go live', tone: 'good' },
  live: { label: 'Live', tone: 'good' },
};

export const RULE_OUTCOME: Record<string, { label: string; tone: Tone }> = {
  pass: { label: 'Pass', tone: 'good' },
  fail: { label: 'Check', tone: 'bad' },
  unknown: { label: 'Unknown', tone: 'neutral' },
  info: { label: 'Note', tone: 'info' },
};

export const AI_RECOMMENDATION: Record<string, { label: string; tone: Tone }> = {
  approve: { label: 'Suggests approve', tone: 'good' },
  needs_a_look: { label: 'Needs a look', tone: 'warn' },
  likely_reject: { label: 'Likely reject', tone: 'bad' },
};

export const ASSESSMENT: Record<string, { label: string; tone: Tone }> = {
  evidence_found: { label: 'Evidence found', tone: 'good' },
  concerns_found: { label: 'Concerns found', tone: 'bad' },
  no_information: { label: 'No information', tone: 'neutral' },
};

export const CRITERIA: Record<string, string> = {
  regional: 'Regional and manufactured',
  not_mainstream: 'Not mainstream',
  quality: 'Focus on quality',
  natural: 'Natural ingredients',
};

export const CATEGORY_LABELS: Record<string, string> = {
  spirits: 'Spirits',
  beer: 'Beer',
  wine: 'Wine',
  food: 'Food',
};

export const BUSINESS_TYPES: Record<string, string> = {
  sole_trader: 'Sole trader',
  company: 'Company (GmbH, UG, GbR and others)',
  small_business: 'Small business (Kleinunternehmer, §19 UStG)',
};

export const MAKES_OWN: Record<string, string> = {
  yes: 'Yes, we make everything ourselves',
  partly: 'Partly: we make some and resell others',
  no: 'No, we resell products made by others',
};

export const PLANS: Record<string, { name: string; detail: string }> = {
  starter: { name: 'Starter', detail: '[Commission and limits to be confirmed]' },
  professional: { name: 'Professional', detail: '[Commission and limits to be confirmed]' },
};
