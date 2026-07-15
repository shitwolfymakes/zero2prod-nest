import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PinoLogger } from 'nestjs-pino';
import { Pool } from 'pg';

import { EnvironmentVariables } from '../config/env.validation';
import { DRIZZLE, PG_POOL } from './drizzle.constants';
import * as schema from './schema';

/**
 * Provides the Drizzle client (and the `pg` pool behind it) application-wide.
 *
 * The connection string and pool sizing/SSL come from validated
 * configuration, and the pool is closed on shutdown — with
 * `enableShutdownHooks()`, `onModuleDestroy` runs on SIGTERM in production and
 * on `app.close()` in tests, so nothing leaks a connection.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService, PinoLogger],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        logger: PinoLogger,
      ) => {
        logger.setContext('DatabaseModule');

        const pool = new Pool({
          connectionString: config.get('DATABASE_URL'),
          ssl: config.get('DATABASE_SSL'),
          max: config.get('DATABASE_POOL_MAX'),
          idleTimeoutMillis: config.get('DATABASE_POOL_IDLE_TIMEOUT_MS'),
          connectionTimeoutMillis: config.get(
            'DATABASE_POOL_CONNECTION_TIMEOUT_MS',
          ),
        });

        // The pool is an EventEmitter; an idle client that errors out (e.g. the
        // connection is reset by the DB) emits 'error' here. Without a
        // listener, that's an unhandled event and crashes the process.
        pool.on('error', (err: Error) => {
          logger.error(err, 'Unexpected error on idle Postgres client');
        });

        return pool;
      },
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
