#! /usr/bin/env bash
set -x
set -eo pipefail

if ! [ -x "$(command -v psql)" ]; then
    echo >&2 "Error: psql is not installed"
    echo >&2 "sudo apt install postgresql-common postgresql-client-17"
    exit 1
fi

# Check if a custom user has been set, otherwise default to 'postgres'
DB_USER="${POSTGRES_USER:=postgres}"
# Check if a custom password has been set, otherwise default to 'password'
DB_PASSWORD="${POSTGRES_PASSWORD:=password}"
# Check if a custom database name has been set, otherwise default to 'newsletter_nest'
DB_NAME="${POSTGRES_DB:=newsletter_nest}"
# Check if a custom port has been set, otherwise default to '5432'
DB_PORT="${POSTGRES_PORT:=5432}"
# Check if a custom host has been set, otherwise default to 'localhost'
DB_HOST="${POSTGRES_HOST:=localhost}"

# skip docker if a containerized Postgres db is already running
if [[ -z "${SKIP_DOCKER}" ]]; then
    docker run \
        --name postgres \
        -e POSTGRES_USER=${DB_USER} \
        -e POSTGRES_PASSWORD=${DB_PASSWORD} \
        -e POSTGRES_DB=${DB_NAME} \
        -p "${DB_PORT}":5432 \
        -d postgres \
        postgres -N 1000
fi

# ping postgres until it's ready to accept commands
export PGPASSWORD="${DB_PASSWORD}"
until psql -h ${DB_HOST} -U ${DB_USER} -p ${DB_PORT} -d "postgres" -c '\q'; do
    >&2 echo "Postgres is still unavailable - sleeping"
    sleep 1
done

>&2 echo "Postgres is up and running on port ${DB_PORT}"

# create the database if it isn't there yet, then bring it up to date.
# `drizzle-kit migrate` is the counterpart of `sqlx migrate run`; unlike the
# sqlx CLI it has no `database create`, so we ask psql to do that part.
psql -h "${DB_HOST}" -U "${DB_USER}" -p "${DB_PORT}" -d "postgres" \
    -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" \
    | grep -q 1 \
    || psql -h "${DB_HOST}" -U "${DB_USER}" -p "${DB_PORT}" -d "postgres" \
        -c "CREATE DATABASE \"${DB_NAME}\""

DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
export DATABASE_URL
npm run db:migrate

>&2 echo "Postgres has been migrated, ready to go!"
