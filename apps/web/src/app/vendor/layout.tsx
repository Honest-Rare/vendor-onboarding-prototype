import type { ReactNode } from 'react';
import { PanelShell } from '@/components/PanelShell';

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <PanelShell area="Vendor panel" loginPath="/vendor/login" nav={[{ href: '/vendor', label: 'Shop setup' }]}>
      {children}
    </PanelShell>
  );
}
