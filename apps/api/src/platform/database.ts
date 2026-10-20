import pg from 'pg';
import { config } from '../config.js';

export const PG_POOL = Symbol('PG_POOL');

export type Db = pg.Pool;
export type DbClient = pg.Pool | pg.PoolClient;

export function createPool(): pg.Pool {
  return new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
}

/** Runs fn inside a transaction; rolls back on error. */
export async function withTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
