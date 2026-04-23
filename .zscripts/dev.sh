#!/bin/bash
# Custom dev script - keeps Next.js server alive
# This runs inside a subshell from start.sh, so we use exec to replace the shell
# This prevents the subshell from exiting and killing the server

echo "[DEV] Installing dependencies..."
cd /home/z/my-project
bun install

echo "[DEV] Setting up database..."
bun run db:push

echo "[DEV] Starting Next.js dev server (will stay alive)..."
# Use exec to replace this shell with the bun process
# This ensures the process never exits and stays under tini's management
exec bun run dev
