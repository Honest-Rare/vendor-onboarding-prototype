'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleMockRequest, mockFileUrl, registerMockUpload } from './mock/server';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
  }
}

type Options = { method?: string; json?: unknown; body?: BodyInit };

/**
 * Front-end-only build: every call is answered by the in-browser mock in `lib/mock/server.ts`.
 * The paths and response shapes are the contract for the real backend. To connect one, replace the
 * body of this function with a `fetch` to the backend (see docs/decisions/0001-front-end-only.md).
 */
export async function api<T = any>(path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? (options.json !== undefined || options.body ? 'POST' : 'GET');
  // A short pause so loading states and disabled buttons behave as they would over a network.
  await new Promise((resolve) => setTimeout(resolve, 150));
  const res = handleMockRequest(method, path, options.json ?? options.body);
  if (res.status >= 400) {
    const body = res.body as any;
    const message = typeof body?.message === 'string' ? body.message : `Something went wrong (${res.status})`;
    throw new ApiError(message, res.status, Array.isArray(body?.errors) ? body.errors : []);
  }
  // A copy, so pages never hold a reference into the mock store.
  return structuredClone(res.body) as T;
}

/** Uploads a file. In the mock, the file stays in this browser tab as an object URL. */
export async function uploadFile(path: string, file: File): Promise<{ id: string; name: string }> {
  registerMockUpload(path, file);
  const form = new FormData();
  form.append('file', file);
  return api(path, { body: form });
}

/** URL of an uploaded or sample file, for links and <img>. */
export function fileUrl(id: string): string {
  return mockFileUrl(id);
}

/**
 * Loads data for a signed-in page. Sends the user to the login page on 401.
 * `pollWhile` keeps refreshing (every 2 s) while it returns true, e.g. while checks are running.
 */
export function useLoad<T>(path: string, loginPath?: string, pollWhile?: (data: T) => boolean) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const pollRef = useRef(pollWhile);
  pollRef.current = pollWhile;

  const reload = useCallback(async () => {
    try {
      const result = await api<T>(path);
      setData(result);
      setError(null);
      return result;
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(String(e), 0);
      if (err.status === 401 && loginPath) {
        router.replace(`${loginPath}?next=${encodeURIComponent(window.location.pathname)}`);
      }
      setError(err);
      return null;
    }
  }, [path, loginPath, router]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const result = await reload();
      if (!stopped && result && pollRef.current?.(result)) timer = setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [reload]);

  return { data, error, reload };
}

/** "9 Nov 2026" */
export function formatDate(value: string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function waitingSince(value: string | null | undefined) {
  if (!value) return '';
  const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return 'under an hour';
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}
