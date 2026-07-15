import { Inject, Injectable } from '@nestjs/common';

import { DRIZZLE, DrizzleDB } from '../database/drizzle.constants';
import { Subscription, subscriptions } from '../database/schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Subscribe an email, idempotently.
   *
   * A subscription is keyed by email, so "subscribe me" is a request to reach a
   * state rather than to create a fresh row each time. Repeating it — a
   * double-clicked button, a retried form post — is not an error: we upsert, so
   * the caller lands in the same place every time and the endpoint is safe to
   * retry. A repeat updates the name (the request is the source of truth) but
   * keeps the original `subscribed_at`.
   */
  async subscribe(dto: CreateSubscriptionDto): Promise<Subscription> {
    const [subscription] = await this.db
      .insert(subscriptions)
      .values({ email: dto.email, name: dto.name })
      .onConflictDoUpdate({
        target: subscriptions.email,
        set: { name: dto.name },
      })
      .returning();
    return subscription;
  }
}
