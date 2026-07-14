//! src/configuration/configuration.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { load } from 'js-yaml';

import { Secret } from './secret';

export class DatabaseSettings {
  constructor(
    readonly username: string,
    readonly password: Secret<string>,
    readonly port: number,
    readonly host: string,
    readonly databaseName: string,
  ) {}

  connectionString(): Secret<string> {
    return new Secret(
      `postgres://${this.username}:${this.password.exposeSecret()}@${this.host}:${this.port}/${this.databaseName}`,
    );
  }

  connectionStringWithoutDb(): Secret<string> {
    return new Secret(
      `postgres://${this.username}:${this.password.exposeSecret()}@${this.host}:${this.port}`,
    );
  }
}

export class Settings {
  constructor(
    readonly database: DatabaseSettings,
    readonly applicationPort: number,
  ) {}
}

/**
 * Read `configuration.yaml` and deserialize it into `Settings`.
 *
 * Throws if the file is missing a field or a field has the wrong type, which
 * is the behaviour `serde` gives the Rust project for free.
 */
export function getConfiguration(
  path = resolve(process.cwd(), 'configuration.yaml'),
): Settings {
  const raw = load(readFileSync(path, 'utf8'));
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`${path} is not a YAML mapping`);
  }

  const root = raw as Record<string, unknown>;
  const database = requireField(root, 'database');
  if (database === null || typeof database !== 'object') {
    throw new Error('configuration: `database` is not a YAML mapping');
  }
  const db = database as Record<string, unknown>;

  return new Settings(
    new DatabaseSettings(
      requireString(db, 'username', 'database'),
      new Secret(requireString(db, 'password', 'database')),
      requireNumber(db, 'port', 'database'),
      requireString(db, 'host', 'database'),
      requireString(db, 'database_name', 'database'),
    ),
    requireNumber(root, 'application_port'),
  );
}

function requireField(
  source: Record<string, unknown>,
  key: string,
  parent?: string,
): unknown {
  const value = source[key];
  if (value === undefined || value === null) {
    throw new Error(
      `configuration: missing field \`${parent ? `${parent}.${key}` : key}\``,
    );
  }
  return value;
}

function requireString(
  source: Record<string, unknown>,
  key: string,
  parent?: string,
): string {
  const value = requireField(source, key, parent);
  if (typeof value !== 'string') {
    throw new Error(
      `configuration: \`${parent ? `${parent}.${key}` : key}\` must be a string, got ${typeof value}`,
    );
  }
  return value;
}

function requireNumber(
  source: Record<string, unknown>,
  key: string,
  parent?: string,
): number {
  const value = requireField(source, key, parent);
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(
      `configuration: \`${parent ? `${parent}.${key}` : key}\` must be an integer, got ${typeof value}`,
    );
  }
  return value;
}
