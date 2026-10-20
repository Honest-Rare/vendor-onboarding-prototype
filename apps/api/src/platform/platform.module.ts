import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { createPool, PG_POOL, type Db } from './database.js';
import { FilesService } from './files.service.js';
import { JobsService } from './jobs.service.js';

@Injectable()
class PoolShutdown implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly db: Db) {}
  async onApplicationShutdown() {
    await this.db.end();
  }
}

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: createPool }, PoolShutdown, JobsService, FilesService],
  exports: [PG_POOL, JobsService, FilesService],
})
export class PlatformModule {}
