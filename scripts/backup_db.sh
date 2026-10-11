#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/home/yuto0926space/linkord/backups}"
DB_PATH="/home/yuto0926space/linkord/backend/linkord.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
    BACKUP_FILE="$BACKUP_DIR/linkord_backup_$TIMESTAMP.db"
    # Safe copy with sqlite3 vacuum or python sqlite backup if sqlite3 is missing
    python3 -c "import sqlite3, sys; src=sqlite3.connect('$DB_PATH'); dst=sqlite3.connect('$BACKUP_FILE'); src.backup(dst); dst.close(); src.close()"
    gzip "$BACKUP_FILE"
    echo "Backup completed: ${BACKUP_FILE}.gz"
    
    # Keep only the last 14 backups
    ls -t "$BACKUP_DIR"/linkord_backup_*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
else
    echo "Database file $DB_PATH not found."
    exit 1
fi
