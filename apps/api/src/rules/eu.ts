// EU member states (ISO code → VAT prefix). Greece uses "EL" in VAT numbers.
export const EU_COUNTRIES: Record<string, { name: string; vatPrefix: string }> = {
  AT: { name: 'Austria', vatPrefix: 'AT' },
  BE: { name: 'Belgium', vatPrefix: 'BE' },
  BG: { name: 'Bulgaria', vatPrefix: 'BG' },
  HR: { name: 'Croatia', vatPrefix: 'HR' },
  CY: { name: 'Cyprus', vatPrefix: 'CY' },
  CZ: { name: 'Czechia', vatPrefix: 'CZ' },
  DK: { name: 'Denmark', vatPrefix: 'DK' },
  EE: { name: 'Estonia', vatPrefix: 'EE' },
  FI: { name: 'Finland', vatPrefix: 'FI' },
  FR: { name: 'France', vatPrefix: 'FR' },
  DE: { name: 'Germany', vatPrefix: 'DE' },
  GR: { name: 'Greece', vatPrefix: 'EL' },
  HU: { name: 'Hungary', vatPrefix: 'HU' },
  IE: { name: 'Ireland', vatPrefix: 'IE' },
  IT: { name: 'Italy', vatPrefix: 'IT' },
  LV: { name: 'Latvia', vatPrefix: 'LV' },
  LT: { name: 'Lithuania', vatPrefix: 'LT' },
  LU: { name: 'Luxembourg', vatPrefix: 'LU' },
  MT: { name: 'Malta', vatPrefix: 'MT' },
  NL: { name: 'Netherlands', vatPrefix: 'NL' },
  PL: { name: 'Poland', vatPrefix: 'PL' },
  PT: { name: 'Portugal', vatPrefix: 'PT' },
  RO: { name: 'Romania', vatPrefix: 'RO' },
  SK: { name: 'Slovakia', vatPrefix: 'SK' },
  SI: { name: 'Slovenia', vatPrefix: 'SI' },
  ES: { name: 'Spain', vatPrefix: 'ES' },
  SE: { name: 'Sweden', vatPrefix: 'SE' },
};

export function isEu(country: string): boolean {
  return country.toUpperCase() in EU_COUNTRIES;
}

export function normalizeVatId(value: string): string {
  return value.toUpperCase().replace(/[\s.\-]/g, '');
}
