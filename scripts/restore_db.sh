#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/home/yuto0926space/linkord/backups}"
DB_PATH="/home/yuto0926space/linkord/backend/linkord.db"

# Target backup file specified or latest backup
TARGET_BACKUP="$1"
if [ -z "$TARGET_BACKUP" ]; then
    TARGET_BACKUP=$(ls -t "$BACKUP_DIR"/linkord_backup_*.db.gz 2>/dev/null | head -n 1)
fi

if [ -z "$TARGET_BACKUP" ] || [ ! -f "$TARGET_BACKUP" ]; then
    echo "Error: No valid backup file found to restore."
    echo "Usage: $0 [path/to/backup.db.gz]"
    exit 1
fi

echo "Restoring database from: $TARGET_BACKUP"

TMP_RESTORE="/tmp/linkord_restore_tmp.db"
rm -f "$TMP_RESTORE"

if [[ "$TARGET_BACKUP" == *.gz ]]; then
    gzip -dc "$TARGET_BACKUP" > "$TMP_RESTORE"
else
    cp "$TARGET_BACKUP" "$TMP_RESTORE"
fi

# Verify SQLite integrity
INTEGRITY=$(python3 -c "import sqlite3; con = sqlite3.connect('$TMP_RESTORE'); res = con.execute('PRAGMA integrity_check;').fetchone()[0]; con.close(); print(res)")
if [ "$INTEGRITY" != "ok" ]; then
    echo "Error: Backup integrity check failed ($INTEGRITY)."
    rm -f "$TMP_RESTORE"
    exit 1
fi

# Backup current DB before overwrite if exists
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "${DB_PATH}.pre_restore_$(date +%Y%m%d_%H%M%S)"
fi

mv "$TMP_RESTORE" "$DB_PATH"
echo "Database successfully restored to: $DB_PATH"
