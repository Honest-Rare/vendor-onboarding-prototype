// Applies SQL files from apps/api/migrations in order. `--reset` drops everything first.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPool } from '../platform/database.js';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

async function main() {
  const pool = createPool();
  try {
    if (process.argv.includes('--reset')) {
      await pool.query(`
        drop schema if exists identity cascade;
        drop schema if exists vendors cascade;
        drop schema if exists payments cascade;
        drop schema if exists platform cascade;
        drop table if exists public.schema_migrations;
      `);
      console.log('Database reset.');
    }

    await pool.query(`
      create table if not exists public.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )`);

    const applied = new Set(
      (await pool.query<{ name: string }>('select name from public.schema_migrations')).rows.map((r) => r.name),
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into public.schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    }
    console.log('Migrations up to date.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
