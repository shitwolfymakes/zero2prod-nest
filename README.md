# zero2prod — NestJS edition

A port of the email-newsletter API from [_Zero To Production In Rust_](https://www.zero2prod.com/),
built with NestJS, Drizzle ORM and Postgres. It follows the book up to the end
of the telemetry chapter: a health check, a subscription endpoint backed by
Postgres, layered configuration, structured JSON logging with request ids, and
an integration suite that runs against a real database.

## Getting started

You need Node 20+, Docker (for Postgres) and `psql`.

```bash
npm install
./scripts/init_db.sh   # starts Postgres in Docker, creates the db, migrates it
npm run start:dev
```

The API listens on the `application_port` from `configuration.yaml` (8000 by
default):

```bash
curl -v http://127.0.0.1:8000/health_check
curl -v -X POST -d 'email=ursula@example.com&name=le%20guin' http://127.0.0.1:8000/subscriptions
```

If Postgres is already running, skip the Docker step:

```bash
SKIP_DOCKER=true ./scripts/init_db.sh
```

This project keeps its schema in a database of its own, `newsletter_nest`, so it
can share a Postgres instance with the Rust original without the two migration
ledgers (Drizzle's and sqlx's) colliding over the same tables. Override it with
`POSTGRES_DB`, and in `configuration.yaml` if you want the app to follow.

## Tests

```bash
npm test               # spins up the app + a throwaway database per test
TEST_LOG=true npm test # ...and show the logs while doing it
```

Every test gets its own randomly-named database (created, migrated, and dropped
on teardown) and its own application bound to an OS-assigned port, so the suite
is order-independent and safe to run repeatedly.

## Logs

Logs are newline-delimited JSON on stdout, one object per event, each request
line carrying a `request_id`. Pipe them through `pino-pretty` when you want to
read them yourself:

```bash
npm start | npx pino-pretty
```

`LOG_LEVEL` overrides the level (`LOG_LEVEL=debug npm start`).

## Migrations

The schema lives in [src/db/schema.ts](src/db/schema.ts). Drizzle generates the
SQL from it:

```bash
npm run db:generate   # write a new migration into ./migrations
npm run db:migrate    # apply pending migrations
```

## How it maps to the Rust original

The layout deliberately mirrors the book's, so the two repos can be read side
by side.

| Rust                                     | NestJS                                        |
| ---------------------------------------- | --------------------------------------------- |
| `actix-web`                              | NestJS on Express                             |
| `src/startup.rs` — `run(listener, pool)` | [src/startup.ts](src/startup.ts) — `run(port, pool)` |
| `src/routes/*`                           | [src/routes/\*](src/routes/) (controller + service per route) |
| `sqlx` + `migrations/`                   | Drizzle ORM + `migrations/` (still plain SQL) |
| `serde` + `config` over `configuration.yaml` | [src/configuration/](src/configuration/) over an identically-shaped `configuration.yaml` |
| `secrecy::Secret`                        | [`Secret<T>`](src/configuration/secret.ts) — redacts on log/serialize |
| `tracing` + `tracing-bunyan-formatter`   | `pino` via `nestjs-pino` — both emit line-delimited JSON |
| `tracing-actix-web::TracingLogger`       | `pino-http` request logging with a `request_id` |
| `#[tracing::instrument(fields(...))]`    | `logger.assign({ ... })` on the request-scoped logger |
| `tests/health_check.rs` + `spawn_app`    | [test/health-check.e2e-spec.ts](test/health-check.e2e-spec.ts) + [`spawnApp`](test/helpers/spawn-app.ts) |
| `cargo fmt` / `cargo clippy` / `cargo audit` | Prettier / ESLint / `npm audit` |

A couple of things do not have exact counterparts:

- **Compile-time-checked queries.** `sqlx::query!` validates SQL against a live
  database at compile time. Drizzle instead builds queries from the schema in
  [src/db/schema.ts](src/db/schema.ts), so they are checked by `tsc` — the
  guarantee comes from the TypeScript types rather than from the database.
- **Spans.** `tracing` has real spans with enter/exit events. `pino` has no span
  concept; per-request context is approximated by a child logger whose fields
  are attached with `assign()`.
