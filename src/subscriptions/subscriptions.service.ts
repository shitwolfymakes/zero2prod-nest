import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { DRIZZLE, DrizzleDB } from '../database/drizzle.constants';
import { Subscription, subscriptions } from '../database/schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = '23505';

/**
 * Look for a Postgres error code anywhere in the error's cause chain. Drizzle
 * wraps the driver's error, so the `code` we want sits on a nested `cause`
 * rather than on the thrown object itself.
 */
function hasPgErrorCode(error: unknown, code: string): boolean {
  for (let current = error, depth = 0; current != null && depth < 5; depth++) {
    if (
      typeof current === 'object' &&
      'code' in current &&
      (current as { code?: unknown }).code === code
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    try {
      const [subscription] = await this.db
        .insert(subscriptions)
        .values({ email: dto.email, name: dto.name })
        .returning();
      return subscription;
    } catch (error: unknown) {
      // A repeat signup is a client problem (409), not a server fault (500).
      if (hasPgErrorCode(error, UNIQUE_VIOLATION)) {
        throw new ConflictException('Email is already subscribed');
      }
      throw error;
    }
  }
}
