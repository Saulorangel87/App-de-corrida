#!/bin/bash
# Backup script for app-de-corrida database
# This script will be run daily via systemd timer.

set -e

# Configuration
BACKUP_DIR="/var/backups/app-de-corrida"
DB_CONTAINER="app-de-corrida"
DB_USER="postgres"
DB_NAME="passo"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="passo_db_$DATE.sql.gz"
ENCRYPTED_FILENAME="${FILENAME}.age"
RCLONE_REMOTE="oracle-rclone:app-de-corrida-backups" # Replace with actual rclone remote
AGE_RECIPIENT_KEY="age1..." # Replace with actual public key

mkdir -p "$BACKUP_DIR"

# 1. Dump and compress
echo "Dumping database..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

# 2. Encrypt
echo "Encrypting backup..."
# Assuming 'age' is installed
age -r "$AGE_RECIPIENT_KEY" -o "$BACKUP_DIR/$ENCRYPTED_FILENAME" "$BACKUP_DIR/$FILENAME"
rm "$BACKUP_DIR/$FILENAME"

# 3. Upload to Oracle Object Storage (OOS) via rclone
echo "Uploading to Oracle..."
rclone copy "$BACKUP_DIR/$ENCRYPTED_FILENAME" "$RCLONE_REMOTE"

# 4. Cleanup local backups older than 7 days
find "$BACKUP_DIR" -type f -name "*.age" -mtime +7 -delete

# 5. Cleanup remote backups older than 30 days (User requested 30 days retention)
# Note: rclone delete --min-age 30d
rclone delete "$RCLONE_REMOTE" --min-age 30d

echo "Backup complete: $ENCRYPTED_FILENAME"
