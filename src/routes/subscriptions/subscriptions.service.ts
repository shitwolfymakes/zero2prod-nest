//! src/routes/subscriptions/subscriptions.service.ts
import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { DRIZZLE, Database } from '../../db/database.module';
import { subscriptions } from '../../db/schema';
import { FormDataDto } from './dto/form-data.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @InjectPinoLogger(SubscriptionsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async insertSubscriber(form: FormDataDto): Promise<void> {
    this.logger.info('saving new subscriber details in the database');
    try {
      await this.db.insert(subscriptions).values({
        id: randomUUID(),
        email: form.email,
        name: form.name,
        subscribedAt: new Date(),
      });
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Failed to execute query');
      throw error;
    }
  }
}
