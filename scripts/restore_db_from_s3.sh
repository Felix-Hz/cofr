#!/bin/bash
set -euo pipefail

# PostgreSQL S3 Restore Script
# This script runs automatically from /docker-entrypoint-initdb.d/
# when PostgreSQL data directory is empty (initial container start)
# It restores from the most recent backup in S3 if available.

echo "[$(date -Iseconds)] PostgreSQL S3 restore script starting"

# Environment variables that must be set:
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (from PostgreSQL)
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (for S3 access)
# BACKUP_S3_BUCKET, BACKUP_S3_PREFIX (configured in backup script)

# Set default values if not provided
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-us-east-1}"
S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT:-}"

# Construct AWS CLI base command with optional endpoint
AWS_CLI_BASE="aws s3"
if [ -n "$S3_ENDPOINT_URL" ]; then
    AWS_CLI_BASE="$AWS_CLI_BASE --endpoint-url $S3_ENDPOINT_URL"
fi

# Wait for PostgreSQL to be ready (should already be ready in initdb.d context)
echo "[$(date -Iseconds)] Checking if PostgreSQL is ready..."
until pg_isready -h localhost -U "$POSTGRES_USER" >/dev/null 2>&1; do
    echo "[$(date -Iseconds)] Waiting for PostgreSQL..."
    sleep 1
done

echo "[$(date -Iseconds)] PostgreSQL is ready"

# Check if any recent backup exists in S3
echo "[$(date -Iseconds)] Looking for backups in S3 bucket: ${BACKUP_S3_BUCKET}, prefix: ${BACKUP_S3_PREFIX}/"

# List backup files and find the most recent one
BACKUP_LIST=$($AWS_CLI_BASE ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" 2>/dev/null || true)

if [ -z "$BACKUP_LIST" ]; then
    echo "[$(date -Iseconds)] No backups found in S3. Starting with empty database."
    exit 0
fi

# Extract the most recent .sql.gz file (sorted by date)
LATEST_BACKUP=$(echo "$BACKUP_LIST" | grep -E '\.sql\.gz$' | sort -r | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "[$(date -Iseconds)] No .sql.gz backup files found in S3. Starting with empty database."
    exit 0
fi

# Extract filename from S3 listing (format: date time size filename)
BACKUP_FILENAME=$(echo "$LATEST_BACKUP" | awk '{print $NF}')

echo "[$(date -Iseconds)] Found backup: $BACKUP_FILENAME"

# Download backup and checksum
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

BACKUP_PATH="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${BACKUP_FILENAME}"
CHECKSUM_PATH="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${BACKUP_FILENAME}.sha256"

echo "[$(date -Iseconds)] Downloading backup from S3..."
$AWS_CLI_BASE cp "$BACKUP_PATH" "$TEMP_DIR/backup.sql.gz"

echo "[$(date -Iseconds)] Downloading checksum..."
$AWS_CLI_BASE cp "$CHECKSUM_PATH" "$TEMP_DIR/backup.sql.gz.sha256" 2>/dev/null || {
    echo "[$(date -Iseconds)] WARNING: Checksum file not found, skipping verification"
    CHECKSUM_MISSING=1
}

# Verify checksum if available
if [ -z "${CHECKSUM_MISSING:-}" ]; then
    echo "[$(date -Iseconds)] Verifying checksum..."
    cd "$TEMP_DIR"
    if ! sha256sum -c backup.sql.gz.sha256; then
        echo "[$(date -Iseconds)] ERROR: Checksum verification failed! Backup may be corrupted."
        echo "[$(date -Iseconds)] Aborting restore to prevent data corruption."
        exit 1
    fi
    echo "[$(date -Iseconds)] Checksum verification passed"
fi

# Restore the database
echo "[$(date -Iseconds)] Restoring database from backup..."
gunzip -c "$TEMP_DIR/backup.sql.gz" | psql -v ON_ERROR_STOP=1 -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date -Iseconds)] Database restore completed successfully from: $BACKUP_FILENAME"
echo "[$(date -Iseconds)] Database ready for use"