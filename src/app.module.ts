//! src/app.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { Pool } from 'pg';

import { DatabaseModule } from './db/database.module';
import { HealthCheckController } from './routes/health-check/health-check.controller';
import { SubscriptionsController } from './routes/subscriptions/subscriptions.controller';
import { SubscriptionsService } from './routes/subscriptions/subscriptions.service';
import { telemetryModule } from './telemetry/telemetry';

@Module({})
export class AppModule {
  static forRoot(pool: Pool): DynamicModule {
    return {
      module: AppModule,
      imports: [telemetryModule(), DatabaseModule.forRoot(pool)],
      controllers: [HealthCheckController, SubscriptionsController],
      providers: [SubscriptionsService],
    };
  }
}
