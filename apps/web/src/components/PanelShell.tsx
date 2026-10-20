'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';

type NavItem = { href: string; label: string };

/** Header for the admin console and the vendor panel. */
export function PanelShell({
  area,
  nav,
  loginPath,
  children,
}: {
  area: string;
  nav: NavItem[];
  loginPath: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === loginPath || pathname.endsWith('/set-password');

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace(loginPath);
  };

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="row" style={{ gap: 0 }}>
            <Link href="/" className="brand">
              Honest <span>&amp;</span> Rare
            </Link>
            <span className="area-tag">{area}</span>
          </div>
          {!onLogin && (
            <nav className="nav" aria-label={area}>
              {nav.map((item) => {
                const active = item.href === pathname || (item.href !== nav[0].href && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className={active ? 'active' : undefined}>
                    {item.label}
                  </Link>
                );
              })}
              <button type="button" onClick={() => void logout()}>
                Sign out
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
