#!/bin/bash
set -euo pipefail

# Enhanced PostgreSQL Backup Script with S3 Pruning
# Creates daily backups, keeps only last 3 versions in S3
# Designed to run via systemd timer at midnight UTC

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

# Configuration
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-${S3_BUCKET_NAME:-}}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-${AWS_REGION:-ap-southeast-1}}"
S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT:-}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILENAME="postgres-${TIMESTAMP}.sql.gz"

# Construct AWS CLI base command with optional endpoint
AWS_CLI_BASE="aws s3"
if [ -n "$S3_ENDPOINT_URL" ]; then
    AWS_CLI_BASE="$AWS_CLI_BASE --endpoint-url $S3_ENDPOINT_URL"
fi

# Validate required environment variables
MISSING_VARS=()
for var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY BACKUP_S3_BUCKET POSTGRES_USER POSTGRES_DB; do
    if [ -z "${!var:-}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "Error: Missing required environment variables: ${MISSING_VARS[*]}"
    exit 1
fi

echo "[$(date -Iseconds)] Starting PostgreSQL backup to S3"

# Create temporary directory for backup
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT
BACKUP_FILE="$TEMP_DIR/$BACKUP_FILENAME"

# Database backup using pg_dump through docker
echo "[$(date -Iseconds)] Creating database dump..."
docker compose -p cofr-prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Calculate checksum
echo "[$(date -Iseconds)] Calculating checksum..."
cd "$TEMP_DIR"
sha256sum "$BACKUP_FILENAME" > "$BACKUP_FILENAME.sha256"

# Upload to S3
S3_BASE_PATH="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}"
echo "[$(date -Iseconds)] Uploading backup to S3..."
$AWS_CLI_BASE cp "$BACKUP_FILE" "$S3_BASE_PATH/$BACKUP_FILENAME"
$AWS_CLI_BASE cp "$BACKUP_FILENAME.sha256" "$S3_BASE_PATH/$BACKUP_FILENAME.sha256"

echo "[$(date -Iseconds)] Backup uploaded successfully: $BACKUP_FILENAME"

# Prune old backups: keep only last 3
echo "[$(date -Iseconds)] Pruning old backups (keeping last 3)..."
BACKUP_LIST=$($AWS_CLI_BASE ls "$S3_BASE_PATH/" 2>/dev/null || echo "")

if [ -n "$BACKUP_LIST" ]; then
    # Get list of .sql.gz files, sort by date descending
    BACKUP_FILES=$(echo "$BACKUP_LIST" | grep -E '\.sql\.gz$' | sort -r)
    TOTAL_BACKUPS=$(echo "$BACKUP_FILES" | wc -l)
    
    if [ "$TOTAL_BACKUPS" -gt 3 ]; then
        echo "[$(date -Iseconds)] Found $TOTAL_BACKUPS backups, removing old ones..."
        
        # Get files beyond the 3 most recent
        OLD_BACKUPS=$(echo "$BACKUP_FILES" | tail -n +4)
        
        for backup_line in $OLD_BACKUPS; do
            OLD_FILE=$(echo "$backup_line" | awk '{print $NF}')
            echo "[$(date -Iseconds)] Removing old backup: $OLD_FILE"
            
            # Remove backup file
            $AWS_CLI_BASE rm "$S3_BASE_PATH/$OLD_FILE"
            
            # Remove corresponding checksum file if it exists
            CHECKSUM_FILE="${OLD_FILE}.sha256"
            $AWS_CLI_BASE rm "$S3_BASE_PATH/$CHECKSUM_FILE" 2>/dev/null || true
        done
    else
        echo "[$(date -Iseconds)] Found $TOTAL_BACKUPS backups (≤3), no pruning needed"
    fi
fi

echo "[$(date -Iseconds)] Backup completed successfully. Current backups in S3:"
$AWS_CLI_BASE ls "$S3_BASE_PATH/" 2>/dev/null | grep -E '\.sql\.gz$' | sort -r || true

exit 0