//! src/main.ts
import 'reflect-metadata';

import { Pool } from 'pg';

import { getConfiguration } from './configuration/configuration';
import { address, run } from './startup';
import { getSubscriber, initSubscriber } from './telemetry/telemetry';

async function bootstrap(): Promise<void> {
  const subscriber = getSubscriber('zero2prod', 'info');
  initSubscriber(subscriber);

  // Throws if we can't read the configuration.
  const configuration = getConfiguration();

  const pool = new Pool({
    connectionString: configuration.database.connectionString().exposeSecret(),
  });

  const app = await run(configuration.applicationPort, pool);
  subscriber.info(`Listening on ${address(app)}`);
}

void bootstrap();
