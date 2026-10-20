import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Small in-memory limiter for public endpoints. Enough for one prototype process;
 * production would keep counters in Valkey and add a captcha on the form.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(req: Request, bucket: string) {
    const key = `${bucket}:${req.ip ?? 'unknown'}`;
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      throw new HttpException('Too many requests. Please wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(key, recent);
  }
}
