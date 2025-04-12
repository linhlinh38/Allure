#!/bin/bash
set -e

echo "Creating network if it doesn't exist..."
docker network create allure_network || true

echo "Starting infrastructure services..."
docker-compose -f docker-compose.infra.yml up -d

echo "Waiting for database to be ready..."
sleep 10  # You might want to implement a better health check here

echo "Running database migrations..."
docker-compose -f docker-compose.migrations.yml up --build --abort-on-container-exit

echo "Starting application..."
docker-compose -f docker-compose.app.yml up -d

echo "Deployment complete!"