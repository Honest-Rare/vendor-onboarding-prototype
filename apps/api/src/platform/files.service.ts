import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { PG_POOL, type Db } from './database.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
/** Product feeds and price lists. Browsers report CSV as text/csv or, on Windows with Excel, application/vnd.ms-excel. */
export const SPREADSHEET_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export interface StoredFile {
  id: string;
  ownerType: 'application' | 'vendor';
  ownerRef: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storedName: string;
}

/** Stores uploads on local disk. Production would use private object storage plus a virus scan. */
@Injectable()
export class FilesService {
  constructor(@Inject(PG_POOL) private readonly db: Db) {}

  async save(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
    ownerType: 'application' | 'vendor',
    ownerRef: string | null,
    options: { spreadsheets?: boolean } = {},
  ): Promise<{ id: string; name: string }> {
    if (!file) throw new BadRequestException('No file received');
    const allowed = ALLOWED_TYPES.has(file.mimetype) || (options.spreadsheets === true && SPREADSHEET_TYPES.has(file.mimetype));
    if (!allowed) {
      throw new BadRequestException(
        options.spreadsheets ? 'Only PDF, CSV, Excel, JPG, PNG or WebP files are allowed' : 'Only JPG, PNG, WebP or PDF files are allowed',
      );
    }
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('File is larger than 8 MB');

    const id = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const storedName = `${id}${ext}`;
    await mkdir(config.uploadDir, { recursive: true });
    await writeFile(path.join(config.uploadDir, storedName), file.buffer);
    await this.db.query(
      `insert into platform.files (id, owner_type, owner_ref, original_name, mime_type, size_bytes, stored_name)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, ownerType, ownerRef, file.originalname.slice(0, 200), file.mimetype, file.size, storedName],
    );
    return { id, name: file.originalname };
  }

  async get(id: string): Promise<StoredFile & { absolutePath: string }> {
    const { rows } = await this.db.query(
      `select id, owner_type, owner_ref, original_name, mime_type, size_bytes, stored_name
       from platform.files where id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('File not found');
    return {
      id: row.id,
      ownerType: row.owner_type,
      ownerRef: row.owner_ref,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      storedName: row.stored_name,
      absolutePath: path.resolve(config.uploadDir, row.stored_name),
    };
  }

  async getMany(ids: string[]): Promise<Array<{ id: string; name: string; mimeType: string }>> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query(
      'select id, original_name, mime_type from platform.files where id = any($1::uuid[])',
      [ids],
    );
    return rows.map((r) => ({ id: r.id, name: r.original_name, mimeType: r.mime_type }));
  }

  /** Links files uploaded before submit to the application they belong to. */
  async assignOwner(ids: string[], ownerRef: string, client: { query: Db['query'] } = this.db) {
    if (ids.length === 0) return;
    await client.query(
      `update platform.files set owner_ref = $2 where id = any($1::uuid[]) and owner_ref is null`,
      [ids, ownerRef],
    );
  }
}
