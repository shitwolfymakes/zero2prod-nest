import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

/** Injection token for the Drizzle client. */
export const DRIZZLE = Symbol('DRIZZLE');

/** Injection token for the underlying `pg` pool (owned by DatabaseModule). */
export const PG_POOL = Symbol('PG_POOL');

/** The Drizzle client type, bound to this project's schema. */
export type DrizzleDB = NodePgDatabase<typeof schema>;
