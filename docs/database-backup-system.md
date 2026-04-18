# PostgreSQL Database Backup & Restore System

## Overview

Automated system for backing up PostgreSQL database to S3 and restoring on VPS restart when data is empty. Designed for enterprise reliability.

## Architecture

### Components

1. **Custom PostgreSQL Docker Image** (`infra/docker/postgres/Dockerfile`)
   - Extends `postgres:16-alpine` with AWS CLI
   - Includes restore script in `/docker-entrypoint-initdb.d/`
   - Script runs automatically when data directory is empty

2. **Enhanced Backup Script** (`scripts/backup_postgres.sh`)
   - Creates timestamped backups: `postgres-{timestamp}.sql.gz`
   - Uploads to S3 with SHA256 checksum
   - Prunes old backups, keeping only the 3 most recent
   - Runs via systemd timer at midnight UTC

3. **Restore Script** (`scripts/restore_db_from_s3.sh`)
   - Run automatically when PostgreSQL starts with empty data
   - Downloads most recent backup from S3
   - Verifies checksum before restore
   - Restores via `psql` command

4. **Systemd Service/Timer** (`infra/systemd/`)
   - `postgres-backup.service`: Runs backup script
   - `postgres-backup.timer`: Daily at 00:00:00 UTC
   - Installed automatically by `setup_prod.sh`

5. **S3 Lifecycle Rules** (`infra/terraform/modules/s3/main.tf`)
   - Safety net: deletes backups older than 5 days
   - Primary retention (3 backups) managed by backup script

## Environment Variables Required

Add to `infra/.prod.env` on production VPS:

```bash
# S3 Database Backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BACKUP_S3_BUCKET=cofr-data
BACKUP_S3_ENDPOINT=https://s3.amazonaws.com  # Optional
BACKUP_S3_REGION=us-east-1  # Default
BACKUP_S3_PREFIX=postgres  # Default
```

## Backup Process

1. **Daily at midnight UTC**: systemd timer triggers backup
2. **Backup creation**: `pg_dump` → gzip → S3 upload
3. **Checksum**: SHA256 calculated and uploaded alongside backup
4. **Pruning**: Script keeps only 3 most recent backups in S3
5. **Safety net**: S3 lifecycle deletes anything older than 5 days

## Restore Process (Automatic)

Triggers automatically when:
- PostgreSQL Docker container starts
- Data directory (`/var/lib/postgresql/data`) is empty

Process:
1. Check S3 for most recent backup
2. Download backup and checksum
3. Verify SHA256 checksum
4. Restore via `psql` command
5. Server starts → migrations run if needed

## Systemd Service Management

```bash
# Check timer status
systemctl status postgres-backup.timer

# View backup logs
journalctl -u postgres-backup

# Manual backup run
systemctl start postgres-backup.service

# Enable/disable
systemctl enable postgres-backup.timer
systemctl disable postgres-backup.timer
```

## Monitoring

### Success Indicators
- `journalctl -u postgres-backup` shows success message
- S3 has 3 most recent backup files
- Checksum files exist alongside backups

### Failure Indicators
- Systemd service failure status
- Missing backup files in S3
- Checksum verification failures

### Alerting
- Systemd service failures logged to journal
- Backup script exits with non-zero on critical failures

## Recovery Scenarios

### 1. VPS Restart (Expected)
- PostgreSQL starts with empty data directory
- Restore script runs automatically from S3
- Application starts as normal

### 2. Manual Restore
```bash
# Stop application
docker compose -p cofr-prod down

# Remove PostgreSQL data volume
docker volume rm cofr-prod_postgres_data

# Restart stack
docker compose -p cofr-prod up -d
# PostgreSQL will auto-restore from S3
```

### 3. Backup Verification
```bash
# List backups in S3
aws s3 ls s3://cofr-data/postgres/

# Test restore without applying
# (requires local aws-cli and postgresql-client)
```

## Testing After Deployment

1. **Test Backup**: `systemctl start postgres-backup.service`
2. **Verify S3**: Check 3 backup files exist
3. **Test Restore**: Simulate VPS restart (see manual restore above)
4. **Verify Application**: Ensure app works post-restore

## Maintenance

### Adding New Environment Variables
- Update `infra/.env.example`
- Add validation to `scripts/setup_prod.sh`
- Ensure variables are passed to PostgreSQL container in `docker-compose.prod.yml`

### Upgrading System
- Update scripts in repository
- Redeploy via `scripts/setup_prod.sh`
- Systemd units will be reinstalled

## Troubleshooting

### Backup Fails
```bash
# Check logs
journalctl -u postgres-backup

# Check environment variables
grep AWS infra/.prod.env

# Test S3 connectivity manually
aws s3 ls s3://cofr-data/postgres/
```

### Restore Fails
```bash
# Check PostgreSQL logs
docker compose -p cofr-prod logs postgres

# Verify S3 credentials in container
docker compose -p cofr-prod exec postgres env | grep AWS

# Check backup files exist in S3
aws s3 ls s3://cofr-data/postgres/
```

### Systemd Service Not Installed
```bash
# Manual installation
sudo cp infra/systemd/postgres-backup.service /etc/systemd/system/
sudo cp infra/systemd/postgres-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now postgres-backup.timer
```

## Design Decisions

### Why Custom PostgreSQL Image?
- Clean integration with `docker-entrypoint-initdb.d/`
- No extra containers or dependency chains
- PostgreSQL handles empty data check natively

### Why Script-Based Pruning (not S3 lifecycle)?
- Timestamped filenames (not versioned same key)
- Exact control over "keep last 3" logic
- S3 lifecycle as safety net only

### Why Midnight UTC?
- Predictable schedule
- Low user activity time
- Easy monitoring

### Why No Health Endpoint?
- Direct S3 verification is source of truth
- Systemd journal provides adequate logging
- Simplicity > comprehensive monitoring