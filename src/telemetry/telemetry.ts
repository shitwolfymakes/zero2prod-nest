//! src/telemetry/telemetry.ts
import { randomUUID } from 'node:crypto';

import { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import pino, { DestinationStream, Logger } from 'pino';

/**
 * Build the structured logger.
 *
 * `pino` emits newline-delimited JSON — one object per event, with a `name`,
 * a `level` and a timestamp — which is the same shape the Rust project gets
 * out of `tracing-bunyan-formatter`. Machine-readable logs are the point:
 * `npm start | npx pino-pretty` is the local-development equivalent of piping
 * the Rust binary through `bunyan`.
 *
 * The level is read from `LOG_LEVEL` when set (the counterpart of `RUST_LOG`
 * driving `EnvFilter`), falling back to the level passed by the caller.
 */
export function getSubscriber(
  name: string,
  envFilter: string,
  sink: DestinationStream = pino.destination(1),
): Logger {
  return pino(
    {
      name,
      level: process.env.LOG_LEVEL ?? envFilter,
    },
    sink,
  );
}

let globalSubscriber: Logger | undefined;

/**
 * Register a logger as the global default.
 *
 * It should only be called once — a second call throws, mirroring the panic
 * that `set_global_default` raises in the Rust project.
 */
export function initSubscriber(subscriber: Logger): void {
  if (globalSubscriber !== undefined) {
    throw new Error('Failed to set subscriber: one is already set');
  }
  globalSubscriber = subscriber;
}

export function getGlobalSubscriber(): Logger {
  if (globalSubscriber === undefined) {
    throw new Error('No subscriber has been initialized');
  }
  return globalSubscriber;
}

/**
 * Wire the global logger into Nest, and give every request its own child
 * logger stamped with a `request_id`.
 *
 * This is what `TracingLogger` does for the Rust app: each log line emitted
 * while handling a request carries the id, so a request can be reconstructed
 * from the log stream even under concurrency.
 */
export function telemetryModule(): DynamicModule {
  return LoggerModule.forRoot({
    pinoHttp: {
      logger: getGlobalSubscriber(),
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id =
          typeof existing === 'string' && existing.length > 0
            ? existing
            : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customProps: (req) => ({ request_id: req.id }),
      autoLogging: true,
    },
  });
}
