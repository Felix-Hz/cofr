#!/bin/bash
set -euo pipefail

# Test script for PostgreSQL backup/restore system
# Run this after deployment to verify functionality

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

echo "=== PostgreSQL Backup System Test ==="
echo

# Test 1: Scripts exist and are executable
echo "1. Checking scripts exist..."
for script in backup_postgres.sh restore_db_from_s3.sh; do
    if [ -f "scripts/$script" ] && [ -x "scripts/$script" ]; then
        echo "   ✓ $script exists and is executable"
    else
        echo "   ✗ $script missing or not executable"
        exit 1
    fi
done

# Test 2: Environment files exist
echo
echo "2. Checking environment files..."
for env_file in infra/.env infra/.prod.env; do
    if [ -f "$env_file" ]; then
        echo "   ✓ $env_file exists"
        
        # Check for required variables
        if [ "$env_file" = "infra/.prod.env" ]; then
            for var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY BACKUP_S3_BUCKET; do
                if grep -q "^$var=" "$env_file"; then
                    echo "     ✓ $var is set"
                else
                    echo "     ⚠ $var NOT SET (backup system will fail)"
                fi
            done
        fi
    else
        echo "   ⚠ $env_file missing (create from .env.example)"
    fi
done

# Test 3: Docker files exist
echo
echo "3. Checking Docker configuration..."
if [ -f "infra/docker/postgres/Dockerfile" ]; then
    echo "   ✓ Custom PostgreSQL Dockerfile exists"
else
    echo "   ✗ Custom PostgreSQL Dockerfile missing"
    exit 1
fi

if [ -f "infra/docker-compose.prod.yml" ]; then
    echo "   ✓ Production docker-compose.yml exists"
    # Check for custom image configuration
    if grep -q "cofr-postgres" infra/docker-compose.prod.yml; then
        echo "   ✓ Custom PostgreSQL image configured"
    else
        echo "   ✗ Custom PostgreSQL image not configured"
    fi
else
    echo "   ✗ Production docker-compose.yml missing"
    exit 1
fi

# Test 4: Systemd templates exist
echo
echo "4. Checking systemd templates..."
for unit in postgres-backup.service postgres-backup.timer; do
    if [ -f "infra/systemd/$unit" ]; then
        echo "   ✓ $unit template exists"
    else
        echo "   ✗ $unit template missing"
        exit 1
    fi
done

# Test 5: Documentation exists
echo
echo "5. Checking documentation..."
if [ -f "docs/database-backup-system.md" ]; then
    echo "   ✓ Documentation exists"
else
    echo "   ⚠ Documentation missing (created during install)"
fi

# Test 6: Terraform configuration
echo
echo "6. Checking Terraform S3 lifecycle rules..."
if [ -f "infra/terraform/modules/s3/main.tf" ]; then
    if grep -q "postgres-backups-lifecycle" infra/terraform/modules/s3/main.tf; then
        echo "   ✓ PostgreSQL backup lifecycle rule exists"
    else
        echo "   ✗ PostgreSQL backup lifecycle rule missing"
    fi
else
    echo "   ⚠ S3 Terraform module not found"
fi

# Test 7: Setup script updated
echo
echo "7. Checking setup_prod.sh..."
if [ -f "scripts/setup_prod.sh" ]; then
    if grep -q "postgres-backup" scripts/setup_prod.sh; then
        echo "   ✓ setup_prod.sh includes backup system installation"
    else
        echo "   ✗ setup_prod.sh doesn't install backup system"
    fi
else
    echo "   ✗ setup_prod.sh missing"
fi

echo
echo "=== Test Summary ==="
echo
echo "If all checks pass:"
echo "1. The backup system is correctly configured"
echo "2. Deploy with: scripts/setup_prod.sh"
echo "3. Test backup: systemctl start postgres-backup.service"
echo "4. Check logs: journalctl -u postgres-backup"
echo
echo "To test restore functionality:"
echo "1. docker compose -p cofr-prod down"
echo "2. docker volume rm cofr-prod_postgres_data"
echo "3. docker compose -p cofr-prod up -d"
echo "4. PostgreSQL should auto-restore from S3"
echo
echo "See docs/database-backup-system.md for complete documentation."