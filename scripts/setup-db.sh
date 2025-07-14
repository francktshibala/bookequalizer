#!/bin/bash

# BookEqualizer Database Setup Script
# This script sets up PostgreSQL with pgvector extension for local development

set -e

echo "🚀 Starting BookEqualizer database setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

echo "📦 Starting PostgreSQL with pgvector..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while ! docker-compose exec -T postgres pg_isready -U postgres -d bookequalizer > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout waiting for PostgreSQL to start"
        docker-compose logs postgres
        exit 1
    fi
done

echo "✅ PostgreSQL is ready!"

echo "🗄️  Running database migrations..."
docker-compose exec -T postgres psql -U postgres -d bookequalizer -f /app/database/migrate.sql

echo "🔍 Verifying database setup..."
docker-compose exec -T postgres psql -U postgres -d bookequalizer -c "
SELECT 
    'Tables: ' || count(*) as info
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Extensions: ' || string_agg(extname, ', ') as info
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'vector');
"

echo "✅ Database setup completed successfully!"
echo ""
echo "📋 Connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: bookequalizer"
echo "   Username: postgres"
echo "   Password: password"
echo ""
echo "🔗 Connection string:"
echo "   DATABASE_URL=postgresql://postgres:password@localhost:5432/bookequalizer"
echo ""
echo "🛠️  To connect manually:"
echo "   docker-compose exec postgres psql -U postgres -d bookequalizer"