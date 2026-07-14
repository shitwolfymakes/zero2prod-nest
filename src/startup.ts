//! src/startup.ts
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { Pool } from 'pg';

import { AppModule } from './app.module';

/**
 * Build the application on top of a connection pool and start listening.
 *
 * Pass `0` as the port to let the OS hand out a free one — that is how the
 * integration tests run several applications side by side, and it is the
 * counterpart of binding a `TcpListener` to port 0 in the Rust project. Use
 * `address()` to find out what you actually got.
 */
export async function run(
  port: number,
  pool: Pool,
  host = '127.0.0.1',
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.forRoot(pool), {
    bufferLogs: true,
  });

  // Route Nest's own logging through the structured logger as well, so
  // framework and application lines land in the same JSON stream.
  app.useLogger(app.get(Logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(port, host);
  return app;
}

/** The `http://host:port` the application is actually bound to. */
export function address(app: INestApplication): string {
  const server = app.getHttpServer() as Server;
  const bound = server.address() as AddressInfo;
  return `http://${bound.address}:${bound.port}`;
}
