import type { ReactNode } from 'react';
import { PanelShell } from '@/components/PanelShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PanelShell
      area="Admin console"
      loginPath="/admin/login"
      nav={[
        { href: '/admin', label: 'Applications' },
        { href: '/admin/vendors', label: 'Vendor checks' },
      ]}
    >
      {children}
    </PanelShell>
  );
}
