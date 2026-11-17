'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { api, useLoad } from '@/lib/api';
import { navItems, stageBadge, type Mark, type VendorPanel } from '@/lib/vendor-panel';
import { ErrorBox, Loading } from './ui';

type PanelData = VendorPanel & { prototypeState: 'onboarding' | 'ready' | 'live' };

type Ctx = {
  panel: PanelData;
  reload: () => Promise<unknown>;
  /** Sends a change and reloads the panel, so every status on screen updates together. */
  save: <T = unknown>(path: string, json: unknown, method?: 'PUT' | 'POST') => Promise<T>;
};

const PanelContext = createContext<Ctx | null>(null);

/** Data for vendor pages. Only usable inside the vendor layout. */
export function useVendorPanel(): Ctx {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('useVendorPanel must be used inside the vendor layout');
  return ctx;
}

export function MarkIcon({ mark, size = 16 }: { mark: Mark; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', role: 'img' as const };
  switch (mark) {
    case 'done':
      return (
        <svg {...common} aria-label="Done">
          <circle cx="8" cy="8" r="7" fill="var(--accent)" />
          <path d="M5 8.2l2 2 4-4.2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'progress':
      return (
        <svg {...common} aria-label="In progress">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--info-ink)" strokeWidth="1.5" />
          <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="var(--info-ink)" />
        </svg>
      );
    case 'waiting':
      return (
        <svg {...common} aria-label="Waiting on others">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--waiting)" strokeWidth="1.5" />
          <path d="M8 4.5V8l2.2 1.4" stroke="var(--waiting)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'needs':
      return (
        <svg {...common} aria-label="Needs you">
          <circle cx="8" cy="8" r="7" fill="var(--needs)" />
          <path d="M8 4.5v4.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r="1" fill="#fff" />
        </svg>
      );
    case 'locked':
      return (
        <svg {...common} aria-label="Locked until every step is done">
          <rect x="3.5" y="7" width="9" height="7" rx="1.5" fill="none" stroke="#6b726e" strokeWidth="1.5" />
          <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="#6b726e" strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

function Sidebar({ panel, onStateChange }: { panel: PanelData; onStateChange: (s: string) => void }) {
  const pathname = usePathname();
  const items = navItems(panel);
  const badge = stageBadge(panel);
  const live = panel.stage === 'live';

  return (
    <aside className="vendor-sidebar">
      <div>
        <Link href="/" className="brand" style={{ fontSize: '1.2rem' }}>
          Honest <span>&amp;</span> Rare
        </Link>
        <div className="muted" style={{ fontSize: 13 }}>
          Vendor panel
        </div>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <strong style={{ fontSize: 14 }}>{panel.shop.name}</strong>
        <span className={`badge badge-${badge.tone}`} style={{ alignSelf: 'flex-start', fontSize: 12 }}>
          {live && <span aria-hidden="true">● </span>}
          {badge.label}
        </span>
      </div>
      <nav aria-label="Vendor panel" className="vendor-nav">
        {items.map((item) => {
          const current = item.href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(item.href);
          return (
            <Link key={item.key} href={item.href} aria-current={current ? 'page' : undefined} className={current ? 'active' : undefined}>
              <span>{item.label}</span>
              <MarkIcon mark={item.mark} />
            </Link>
          );
        })}
      </nav>
      <div className="vendor-sidebar-foot">
        {!live && (
          <div aria-label="Status key" className="stack" style={{ gap: 6 }}>
            <span className="row" style={{ gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="7" fill="var(--needs)" />
              </svg>
              Needs you
            </span>
            <span className="row" style={{ gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--waiting)" strokeWidth="2" />
              </svg>
              Waiting on others
            </span>
            <span className="row" style={{ gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="7" fill="var(--accent)" />
              </svg>
              Done
            </span>
          </div>
        )}
        <label className="prototype-switch">
          Prototype state
          <select value={panel.prototypeState} onChange={(e) => onStateChange(e.target.value)}>
            <option value="onboarding">Before go-live</option>
            <option value="ready">Ready to go live</option>
            <option value="live">Live</option>
          </select>
        </label>
      </div>
    </aside>
  );
}

/** Sidebar layout for the signed-in vendor panel. */
export function VendorShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, error, reload } = useLoad<PanelData>('/vendor/panel', '/vendor/login');

  const save = useCallback(
    async <T,>(path: string, json: unknown, method: 'PUT' | 'POST' = 'PUT') => {
      const result = await api<T>(path, { method, json });
      await reload();
      return result;
    },
    [reload],
  );

  const changeState = async (state: string) => {
    await api('/vendor/prototype-state', { json: { state } });
    await reload();
    router.push('/vendor');
  };

  if (error && !data) {
    return (
      <main className="container">
        <ErrorBox error={error} />
      </main>
    );
  }
  if (!data) {
    return (
      <main className="container">
        <Loading />
      </main>
    );
  }

  return (
    <PanelContext.Provider value={{ panel: data, reload, save }}>
      <div className="vendor-layout">
        <Sidebar panel={data} onStateChange={(s) => void changeState(s)} />
        <main className="vendor-main">{children}</main>
      </div>
    </PanelContext.Provider>
  );
}
