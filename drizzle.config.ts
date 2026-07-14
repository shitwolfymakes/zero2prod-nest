//! drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

import { getConfiguration } from './src/configuration/configuration';

// `drizzle-kit` talks to the database directly (to generate and apply
// migrations), so it reads the same `configuration.yaml` the application does.
// `DATABASE_URL` wins when set, which is what `scripts/init_db.sh` and CI use.
const url =
  process.env.DATABASE_URL ??
  getConfiguration().database.connectionString().exposeSecret();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './migrations',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
