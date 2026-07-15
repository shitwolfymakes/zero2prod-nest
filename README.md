# zero2prod — NestJS edition

The email-newsletter API from [_Zero To Production In Rust_](https://www.zero2prod.com/),
rebuilt the way you'd actually build it on Node: **NestJS + Drizzle ORM + Postgres**.
It covers the same ground as the book through the telemetry chapter — a
subscription endpoint backed by Postgres, a health check, layered and validated
configuration, structured logging with request ids, and an integration suite
that runs against a real database — but it follows NestJS conventions rather than
transliterating the Rust design.

## Getting started

You need Node 20+, Docker, and `psql`.

```bash
npm install
cp .env.example .env
./scripts/init_db.sh      # starts Postgres in Docker, creates the db, migrates it
npm run start:dev
```

The API listens on `PORT` (8000 by default):

```bash
curl -s http://127.0.0.1:8000/health
curl -i -X POST -d 'email=ursula@example.com&name=le%20guin' http://127.0.0.1:8000/subscriptions
```

If Postgres is already running, skip the Docker step with `SKIP_DOCKER=true ./scripts/init_db.sh`.

## API

| Method & path        | Behaviour                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| `GET /health`        | `@nestjs/terminus` readiness check; pings the DB and returns its status.  |
| `POST /subscriptions`| `application/x-www-form-urlencoded` `{ email, name }`. `201` on success, `400` on invalid input, `409` if the email is already subscribed. |

## Configuration

Configuration is environment-based (`@nestjs/config` + `.env`), which is the
Node-native equivalent of the book's YAML file. Every variable is validated
**once at startup** by [src/config/env.validation.ts](src/config/env.validation.ts)
(class-validator), so a bad `PORT` or a missing `DATABASE_URL` fails the process
immediately instead of erroring on the first request.

| Variable       | Default                                                        | Notes                                   |
| -------------- | ------------------------------------------------------------- | --------------------------------------- |
| `NODE_ENV`     | `development`                                                  | `development` turns on pretty logs.     |
| `PORT`         | `8000`                                                        |                                         |
| `DATABASE_URL` | `postgres://postgres:password@localhost:5432/newsletter_nest` | Its own database, separate from the Rust original's `newsletter`. |
| `LOG_LEVEL`    | `info`                                                        | pino level; `silent` in tests.          |

## Logs

Logs are line-delimited JSON (`nestjs-pino`), one object per event, each request
line stamped with a `request_id` that's also returned as the `x-request-id`
response header. In development they're pretty-printed via `pino-pretty`.

## Database & migrations

The schema lives in [src/database/schema.ts](src/database/schema.ts); Drizzle
generates plain-SQL migrations from it, and the database owns identity and
timestamps (`gen_random_uuid()`, `now()`).

```bash
npm run db:generate   # write a new migration into ./migrations after a schema change
npm run db:migrate    # apply pending migrations
```

## Tests

```bash
npm test              # boots the app + an ephemeral Postgres via Testcontainers
```

The e2e suite ([test/app.e2e-spec.ts](test/app.e2e-spec.ts)) exercises the real
`AppModule` — nothing mocked — over `app.getHttpServer()` with supertest, the
standard NestJS e2e setup. [Testcontainers](https://testcontainers.com/) gives
the suite its own throwaway Postgres, so it needs no external database and no CI
service container, and the migrations are applied to that container before the
app boots.

## How it relates to the Rust original

Same app, idiomatic-per-ecosystem implementation:

| _Zero To Production_ (Rust)                  | This project (NestJS)                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| `actix-web`, hand-rolled `run(listener, pool)` | NestJS modules + standard `NestFactory` bootstrap            |
| `sqlx` + `migrations/`                       | Drizzle ORM + generated SQL `migrations/`                      |
| `serde` + `config` over `configuration.yaml` | `@nestjs/config` + `.env`, validated by class-validator        |
| `secrecy::Secret<T>`                         | Not needed — secrets stay in env and aren't logged; pino redaction would be the hook if they were |
| `tracing` + `tracing-bunyan-formatter`       | `pino` via `nestjs-pino` (both line-delimited JSON)            |
| `tracing-actix-web` request spans            | `pino-http` request logging + `request_id`                     |
| hand-rolled empty-200 `/health_check`        | `@nestjs/terminus` `/health` with a real DB readiness indicator |
| `500` on any insert error                    | typed errors — `409 Conflict` on duplicate email, `400` on invalid input |
| `tests/health_check.rs` + `spawn_app`        | `Test.createTestingModule` + supertest + Testcontainers        |

The deliberate departures from a 1:1 port are the idiomatic-NestJS choices:
env-based config over YAML, DI-provided Drizzle over a hand-passed pool, Terminus
health checks, Testcontainers for integration tests, and mapping domain errors to
proper HTTP status codes (`201`/`400`/`409`) instead of a blanket `500`.

One thing worth calling out: `sqlx::query!` validates SQL against a live database
at compile time. Drizzle has no equivalent — its safety comes from the schema's
TypeScript types being checked by `tsc`, not from the database.
