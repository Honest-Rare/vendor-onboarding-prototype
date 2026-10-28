export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'document' | 'email';
  required: boolean;
  help?: string;
  options?: Array<{ value: string; label: string }>;
};

export type Section = {
  key: string;
  title: string;
  description: string;
  reviewer: 'admin' | 'stripe';
  requiredBefore: 'go_live' | 'first_payout';
  status:'not_started' | 'submitted' | 'approved' | 'changes_requested';
  adminNote: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
  fields: FieldDef[];
  data: Record<string, any>;
  files: Array<{ id: string; name: string; mimeType: string }>;
};

export type Gate = {
  ready: boolean;
  approved: number;
  total: number;
  waitingForReview: string[];
  needsVendorAction: string[];
};

export function displayValue(field: FieldDef, value: unknown, files: Section['files']): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.type === 'select') return field.options?.find((o) => o.value === value)?.label ?? String(value);
  if (field.type === 'document') return files.find((f) => f.id === value)?.name ?? 'File';
  return String(value);
}
