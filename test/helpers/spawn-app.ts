//! test/helpers/spawn-app.ts
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';

import { INestApplication } from '@nestjs/common';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';

import {
  DatabaseSettings,
  getConfiguration,
} from '../../src/configuration/configuration';
import * as schema from '../../src/db/schema';
import { address, run } from '../../src/startup';
import { getSubscriber, initSubscriber } from '../../src/telemetry/telemetry';

export interface TestApp {
  address: string;
  db: NodePgDatabase<typeof schema>;
  teardown: () => Promise<void>;
}

// Ensure the logging stack is only initialized once. Everything after the
// first call is a no-op, which is what `once_cell::Lazy` buys the Rust suite.
//
// Logs are thrown away unless TEST_LOG is set:
//     TEST_LOG=true npm test
let tracingInitialized = false;
function initTracing(): void {
  if (tracingInitialized) {
    return;
  }
  tracingInitialized = true;

  const sink = process.env.TEST_LOG
    ? process.stdout
    : // The equivalent of `std::io::sink` — swallow everything.
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });
  initSubscriber(getSubscriber('test', 'info', sink));
}

export async function spawnApp(): Promise<TestApp> {
  initTracing();

  const configuration = getConfiguration();
  // Every invocation gets its own logically-isolated database, so tests can
  // assert on table contents without seeing each other's rows.
  const database = new DatabaseSettings(
    configuration.database.username,
    configuration.database.password,
    configuration.database.port,
    configuration.database.host,
    randomUUID(),
  );

  const pool = await configureDatabase(database);
  // Port 0: the OS picks a free port for us.
  const app: INestApplication = await run(0, pool);

  return {
    address: address(app),
    db: drizzle(pool, { schema }),
    teardown: async () => {
      await app.close();
      await pool.end();
      await dropDatabase(database);
    },
  };
}

async function configureDatabase(config: DatabaseSettings): Promise<Pool> {
  // Create the database.
  const maintenance = new Client({
    connectionString: config.connectionStringWithoutDb().exposeSecret(),
  });
  await maintenance.connect();
  await maintenance.query(`CREATE DATABASE "${config.databaseName}"`);
  await maintenance.end();

  // Migrate it.
  const pool = new Pool({
    connectionString: config.connectionString().exposeSecret(),
  });
  await migrate(drizzle(pool, { schema }), {
    migrationsFolder: resolve(__dirname, '../../migrations'),
  });

  return pool;
}

async function dropDatabase(config: DatabaseSettings): Promise<void> {
  const maintenance = new Client({
    connectionString: config.connectionStringWithoutDb().exposeSecret(),
  });
  await maintenance.connect();
  await maintenance.query(`DROP DATABASE IF EXISTS "${config.databaseName}"`);
  await maintenance.end();
}
