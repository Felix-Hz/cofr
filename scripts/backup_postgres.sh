#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

for file in infra/.env infra/.prod.env; do
    if [ ! -f "$file" ]; then
        echo "Error: $file not found"
        exit 1
    fi
done

set -a
# shellcheck disable=SC1091
. "infra/.env"
# shellcheck disable=SC1091
. "infra/.prod.env"
set +a

BACKUP_DIR="${BACKUP_DIR:-.backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-35}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR%/}/postgres-${TIMESTAMP}.sql.gz"

docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip >"$BACKUP_FILE"

find "$BACKUP_DIR" -type f -name 'postgres-*.sql.gz' -mtime +"$BACKUP_RETENTION_DAYS" -delete

if [ -n "${BACKUP_S3_BUCKET:-}" ] && [ -n "${BACKUP_S3_ENDPOINT:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
    OBJECT_KEY="${BACKUP_S3_PREFIX:-postgres}/$(basename "$BACKUP_FILE")"
    docker run --rm \
        -e AWS_ACCESS_KEY_ID \
        -e AWS_SECRET_ACCESS_KEY \
        -e AWS_REGION="${BACKUP_S3_REGION:-us-east-1}" \
        -v "$PWD:/workspace" \
        amazon/aws-cli:2.27.41 \
        s3 cp "/workspace/$BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/${OBJECT_KEY}" \
        --endpoint-url "${BACKUP_S3_ENDPOINT}"
    echo "Uploaded backup to s3://${BACKUP_S3_BUCKET}/${OBJECT_KEY}"
else
    echo "Backup created locally at $BACKUP_FILE"
    echo "S3 upload skipped because BACKUP_S3_* or AWS_* variables are not configured."
fi
