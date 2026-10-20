import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PG_POOL, type Db, type DbClient } from './database.js';

export type JobHandler = (payload: any) => Promise<void>;

const MAX_ATTEMPTS = 5;
const POLL_MS = 1000;

/**
 * Background jobs with retries, stored in platform.jobs.
 * A deliberately small stand-in for Temporal: same idea (durable, retried steps), far less machinery.
 */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Jobs');
  private readonly handlers = new Map<string, JobHandler>();
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(@Inject(PG_POOL) private readonly db: Db) {}

  register(kind: string, handler: JobHandler) {
    this.handlers.set(kind, handler);
  }

  /** Pass `client` to enqueue inside the caller's transaction. */
  async enqueue(kind: string, payload: Record<string, unknown>, client: DbClient = this.db) {
    await client.query('insert into platform.jobs (kind, payload) values ($1, $2)', [kind, JSON.stringify(payload)]);
  }

  onApplicationBootstrap() {
    if (process.env.JOBS_WORKER === 'off') return; // scripts such as the seed only enqueue
    // Jobs left "running" by a crash are picked up again.
    void this.db.query(`update platform.jobs set status = 'queued' where status = 'running'`);
    this.timer = setInterval(() => void this.drain(), POLL_MS);
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private async drain() {
    if (this.busy) return;
    this.busy = true;
    try {
      while (await this.runOne()) {
        // keep going while there is work
      }
    } catch (error) {
      this.logger.error(error);
    } finally {
      this.busy = false;
    }
  }

  private async runOne(): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string; kind: string; payload: any; attempts: number }>(`
      update platform.jobs set status = 'running', attempts = attempts + 1, updated_at = now()
      where id = (
        select id from platform.jobs
        where status = 'queued' and run_after <= now()
        order by id
        for update skip locked
        limit 1
      )
      returning id, kind, payload, attempts`);
    const job = rows[0];
    if (!job) return false;

    const handler = this.handlers.get(job.kind);
    try {
      if (!handler) throw new Error(`No handler registered for job kind "${job.kind}"`);
      await handler(job.payload);
      await this.db.query(`update platform.jobs set status = 'done', updated_at = now() where id = $1`, [job.id]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed = job.attempts >= MAX_ATTEMPTS;
      this.logger.warn(`Job ${job.id} (${job.kind}) attempt ${job.attempts} failed: ${message}`);
      await this.db.query(
        `update platform.jobs
         set status = $2, last_error = $3, run_after = now() + ($4 || ' seconds')::interval, updated_at = now()
         where id = $1`,
        [job.id, failed ? 'failed' : 'queued', message, String(job.attempts * 10)],
      );
    }
    return true;
  }
}
