#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/www/rustshop/backups"
DATE=$(date +"%Y%m%d-%H%M%S")

mkdir -p "$BACKUP_DIR"

cp /var/www/rustshop/public/data/products.json "$BACKUP_DIR/products-$DATE.json"
cp /var/www/rustshop/server/data/store.sqlite "$BACKUP_DIR/store-$DATE.sqlite"

echo "Backups saved to $BACKUP_DIR"
