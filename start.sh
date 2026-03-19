#!/bin/sh

echo "Waiting for database to be ready..."
sleep 10

echo "Running database migrations..."
npx prisma db push

echo "Seeding database..."
npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts || echo "Seed completed or already exists"

echo "Starting application..."
npm start