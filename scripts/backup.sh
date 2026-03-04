#!/bin/bash

# EduPass Backup Script
# Creates backups of database and important configuration files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-edupass}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "================================================"
echo "  EduPass Backup - $DATE"
echo "================================================"
echo ""

# Backup database
echo "Backing up database..."
BACKUP_FILE="$BACKUP_DIR/edupass_db_$DATE.sql"

if PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > "$BACKUP_FILE"; then
    echo "✓ Database backup created: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "✓ Compressed: ${BACKUP_FILE}.gz"
else
    echo "✗ Database backup failed!"
    exit 1
fi

# Backup environment files (excluding sensitive data)
echo ""
echo "Backing up configuration..."
CONFIG_BACKUP="$BACKUP_DIR/config_$DATE.tar.gz"

tar -czf "$CONFIG_BACKUP" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='*.log' \
    .env.example \
    backend/.env.example \
    frontend/.env.example \
    docker-compose.yml \
    ecosystem.config.js \
    package.json \
    backend/package.json \
    frontend/package.json \
    2>/dev/null || true

echo "✓ Configuration backup created: $CONFIG_BACKUP"

# List backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR" | tail -n +2

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "Total backup size: $TOTAL_SIZE"

# Cleanup old backups (keep last 7 days)
echo ""
echo "Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "edupass_db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +7 -delete
echo "✓ Cleanup complete"

echo ""
echo "================================================"
echo "✓ Backup completed successfully!"
echo "================================================"

# Optional: Upload to cloud storage
# Uncomment and configure for your cloud provider
# 
# echo ""
# echo "Uploading to cloud storage..."
# # AWS S3 example:
# # aws s3 cp "${BACKUP_FILE}.gz" s3://your-bucket/edupass-backups/
# # Google Cloud Storage example:
# # gsutil cp "${BACKUP_FILE}.gz" gs://your-bucket/edupass-backups/
# # Azure Blob Storage example:
# # az storage blob upload --file "${BACKUP_FILE}.gz" --container edupass-backups
