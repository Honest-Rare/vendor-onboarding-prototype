'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

/** Calls the NestJS API through the Next.js proxy at /api. */
export async function api<T = any>(path: string, options: Options = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? (options.json !== undefined || options.body ? 'POST' : 'GET'),
    headers: options.json !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    credentials: 'same-origin',
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const message = typeof body?.message === 'string' ? body.message : `Something went wrong (${res.status})`;
    throw new ApiError(message, res.status, Array.isArray(body?.errors) ? body.errors : []);
  }
  return body as T;
}

export async function uploadFile(path: string, file: File): Promise<{ id: string; name: string }> {
  const form = new FormData();
  form.append('file', file);
  return api(path, { body: form });
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

export function formatDate(value: string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function waitingSince(value: string | null | undefined) {
  if (!value) return '';
  const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return 'under an hour';
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}
