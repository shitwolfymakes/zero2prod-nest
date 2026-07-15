import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
  Silent = 'silent',
}

/**
 * The environment this service reads at boot. Every field is validated once, on
 * startup, so a misconfigured deployment fails fast and loudly instead of
 * erroring on the first request that happens to need the bad value.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  // Env vars are strings; coerce to a number before the numeric checks run.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  PORT = 8000;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgres:// connection string',
  })
  DATABASE_URL!: string;

  // Whether the Postgres connection requires TLS. Managed providers (RDS,
  // Supabase, etc.) typically need this; local/Testcontainers Postgres doesn't.
  @Type(() => Boolean)
  @IsBoolean()
  DATABASE_SSL = false;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  DATABASE_POOL_MAX = 10;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  DATABASE_POOL_IDLE_TIMEOUT_MS = 30_000;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  DATABASE_POOL_CONNECTION_TIMEOUT_MS = 5_000;

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.toString()).join('\n'));
  }
  return validated;
}
