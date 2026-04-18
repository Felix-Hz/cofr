# Custom PostgreSQL image with AWS CLI for S3 restore capability
FROM postgres:16-alpine

# Install AWS CLI v2 and required dependencies
RUN apk add --no-cache \
    aws-cli \
    curl \
    && rm -rf /var/cache/apk/*

# Copy restore script to PostgreSQL init directory
# Scripts in /docker-entrypoint-initdb.d/ run automatically when data directory is empty
COPY ../../scripts/restore_db_from_s3.sh /docker-entrypoint-initdb.d/99-restore-from-s3.sh

# Ensure script is executable
RUN chmod +x /docker-entrypoint-initdb.d/99-restore-from-s3.sh

# Keep original PostgreSQL entrypoint and configuration
# No CMD override needed - inherited from base image