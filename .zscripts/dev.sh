#!/bin/bash
# Production server startup - uses standalone build for maximum stability
cd /home/z/my-project

echo "[DEV] Installing dependencies..."
bun install

echo "[DEV] Setting up database..."
bun run db:push

echo "[DEV] Building production app..."
NODE_ENV=production npx next build

echo "[DEV] Setting up standalone files..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null
cp -r public .next/standalone/ 2>/dev/null

echo "[DEV] Starting production server on port 3000..."
exec node /home/z/my-project/.next/standalone/server.js
