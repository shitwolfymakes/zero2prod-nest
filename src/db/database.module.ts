//! src/db/database.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type Database = NodePgDatabase<typeof schema>;

/**
 * Hand the connection pool to the application as an injectable.
 *
 * The pool is created by the caller (`main.ts` in production, the test
 * harness in the integration suite) and passed in, which is what lets the
 * tests point the very same application at a throwaway database.
 */
@Module({})
export class DatabaseModule {
  static forRoot(pool: Pool): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        {
          provide: DRIZZLE,
          useValue: drizzle(pool, { schema }),
        },
      ],
      exports: [DRIZZLE],
    };
  }
}
