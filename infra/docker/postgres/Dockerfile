# Custom PostgreSQL image with AWS CLI for S3 restore capability
FROM postgres:16-alpine

# Install AWS CLI v2 and required dependencies
RUN apk add --no-cache \
    aws-cli \
    curl \
    && rm -rf /var/cache/apk/*

# Copy restore script to PostgreSQL init directory.
# Build context is the repository root so the script is available here.
COPY scripts/restore_db_from_s3.sh /docker-entrypoint-initdb.d/99-restore-from-s3.sh

# Ensure script is executable
RUN chmod +x /docker-entrypoint-initdb.d/99-restore-from-s3.sh

# Keep original PostgreSQL entrypoint and configuration
# No CMD override needed - inherited from base image
