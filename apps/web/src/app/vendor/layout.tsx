'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { VendorShell } from '@/components/VendorShell';

/** Sign-in and set-password stand on their own; every other vendor page gets the sidebar. */
const STANDALONE = ['/vendor/login', '/vendor/set-password', '/vendor/stripe-simulated'];

export default function VendorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE.some((p) => pathname.startsWith(p))) return <>{children}</>;
  return <VendorShell>{children}</VendorShell>;
}
