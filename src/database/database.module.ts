import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { EnvironmentVariables } from '../config/env.validation';
import { DRIZZLE, PG_POOL } from './drizzle.constants';
import * as schema from './schema';

/**
 * Provides the Drizzle client (and the `pg` pool behind it) application-wide.
 *
 * The connection string comes from validated configuration, and the pool is
 * closed on shutdown — with `enableShutdownHooks()`, `onModuleDestroy` runs on
 * SIGTERM in production and on `app.close()` in tests, so nothing leaks a
 * connection.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new Pool({ connectionString: config.get('DATABASE_URL') }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
