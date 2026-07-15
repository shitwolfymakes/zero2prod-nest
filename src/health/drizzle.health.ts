import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';

import { DRIZZLE, DrizzleDB } from '../database/drizzle.constants';

/**
 * Readiness check for the database: a trivial `SELECT 1` proves the pool can
 * reach Postgres. Terminus turns a thrown/`down()` result into a `503`.
 */
@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.db.execute(sql`SELECT 1`);
      return indicator.up();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
