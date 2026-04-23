#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  node /home/z/my-project/node_modules/.bin/next dev -p 3000
  echo "[$(date)] Server exited with code $?. Restarting in 3s..."
  sleep 3
done
