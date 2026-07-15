import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { EnvironmentVariables, validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        pinoHttp: {
          name: 'zero2prod',
          level: config.get('LOG_LEVEL'),
          // Pretty, human-readable logs in development; raw JSON everywhere
          // else so a log collector can parse them.
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
          // Give every request a correlation id, honouring an inbound one from
          // a proxy or upstream service if present.
          genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const header = req.headers['x-request-id'];
            const id =
              typeof header === 'string' && header.length > 0
                ? header
                : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          customProps: (req: IncomingMessage & { id?: string }) => ({
            request_id: req.id,
          }),
        },
      }),
    }),
    DatabaseModule,
    HealthModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
