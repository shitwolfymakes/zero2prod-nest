import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Logger } from 'nestjs-pino';
import { Pool } from 'pg';

import { DRIZZLE, DrizzleDB } from '../../src/database/drizzle.constants';
import * as schema from '../../src/database/schema';

export interface TestApp {
  app: INestApplication;
  db: DrizzleDB;
  teardown: () => Promise<void>;
}

/**
 * Boot the real application against a throwaway Postgres.
 *
 * Testcontainers gives the suite its own disposable database, so tests need no
 * external services and can never see each other's rows. The application is
 * assembled from the production `AppModule` — nothing is mocked — and driven
 * in-process via `app.getHttpServer()`, the standard NestJS e2e setup.
 */
export async function createTestApp(): Promise<TestApp> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:latest',
  ).start();

  // `ConfigModule.forRoot()` reads and validates the environment eagerly, the
  // moment `app.module.ts` is evaluated. So point the environment at the
  // container first, then import `AppModule` — a static import at the top of
  // this file would capture the dev environment before the container exists.
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  await runMigrations(container.getConnectionUri());

  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return {
    app,
    db: app.get<DrizzleDB>(DRIZZLE),
    teardown: async () => {
      await app.close();
      await container.stop();
    },
  };
}

async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await migrate(drizzle(pool, { schema }), {
      migrationsFolder: 'migrations',
    });
  } finally {
    await pool.end();
  }
}
