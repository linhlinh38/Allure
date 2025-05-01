#!/bin/bash
set -e

# Configuration
APP_DIR=~/allure-app
BACKUP_DIR=$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)
LOG_FILE=$APP_DIR/update_$(date +%Y%m%d_%H%M%S).log

# Function to log messages
log() {
  local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo "$message" | tee -a "$LOG_FILE"
}

# Function for rollback
rollback() {
  log "ERROR: Update failed. Rolling back..."

  if [ -d "$BACKUP_DIR" ]; then
    log "Restoring from backup at $BACKUP_DIR"

    # Stop current containers
    log "Stopping current containers..."
    docker compose -f docker-compose.app.yml down || true

    # Restore backup files
    log "Restoring configuration files..."
    cp $BACKUP_DIR/docker-compose.* $APP_DIR/ || true
    cp $BACKUP_DIR/.env $APP_DIR/ || true

    # Restart with backup configuration
    log "Restarting application with previous configuration..."
    docker compose -f docker-compose.app.yml up -d

    log "Rollback completed. Application should be running with previous version."
  else
    log "No backup directory found at $BACKUP_DIR. Cannot rollback automatically."
  fi

  log "Please check the application status manually."
  exit 1
}

# Trap errors for rollback
trap 'rollback' ERR

# Start update process
log "Starting application update process..."

# Create backup directory
mkdir -p $BACKUP_DIR
log "Created backup directory at $BACKUP_DIR"

# Backup current configuration
log "Backing up current configuration..."
cp docker-compose.* $BACKUP_DIR/ || true
cp .env $BACKUP_DIR/ || true

# Backup database (optional but recommended)
if docker ps | grep -q allure_db; then
  log "Backing up database..."
  BACKUP_FILE="$BACKUP_DIR/db_backup.sql"
  docker exec allure_db pg_dump -U postgres allure >"$BACKUP_FILE"
  log "Database backed up to $BACKUP_FILE"
fi

# Create network if it doesn't exist
log "Creating network if it doesn't exist..."
docker network create allure_network || true

# Pull latest images
log "Pulling latest Docker images..."
docker pull minhpham11311/allure-app:latest
# docker pull minhpham11311/allure-migrations:latest
log "Docker images updated to latest version"

# # Run database migrations
# log "Running database migrations..."
# export MIGRATION_NAME=update_$(date +%Y%m%d%H%M%S)
# GENERATE_MIGRATIONS=true MIGRATION_NAME=$MIGRATION_NAME docker compose -f docker compose.migrations.yml up --abort-on-container-exit --remove-orphans

# # Check migration exit code
# if [ $? -ne 0 ]; then
#   log "Migration failed!"
#   rollback
# fi

# Update the application with minimal downtime
log "Updating application..."
docker compose -f docker-compose.app.yml up -d

# Verify application is running
log "Verifying application status..."
sleep 10
if ! docker ps | grep -q allure_app; then
  log "Application failed to start!"
  rollback
fi

log "Application update completed successfully!"
