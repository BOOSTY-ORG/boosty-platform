#!/bin/bash

# Backend Deployment Script
# This script can be used for deploying the backend application

set -e

echo "Starting backend deployment..."

# Set environment variables
export NODE_ENV=production
export PORT=${PORT:-7000}

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "Error: JWT_SECRET environment variable is not set"
    exit 1
fi

# Install production dependencies
echo "Installing production dependencies..."
npm ci --only=production

# Run database migrations if needed (uncomment if you have migrations)
# echo "Running database migrations..."
# npm run migrate

# Start the application
echo "Starting the backend application..."
npm start