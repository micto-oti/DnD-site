#!/bin/sh
set -eu
# Keep credentials, database name and query parameters from the existing .env.
# localhost in a container refers to that container, so use the database network alias.
DATABASE_URL=$(node --input-type=module -e '
    const url = new URL(process.env.DATABASE_URL);
    url.hostname = process.env.DOCKER_DB_HOST || "postgres";
    url.port = process.env.DOCKER_DB_PORT || "5432";
    process.stdout.write(url.toString());
')
export DATABASE_URL
exec "$@"
