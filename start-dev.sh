#!/bin/bash
cd /home/z/my-project
while true; do
  echo "=== Starting dev server at $(date) ===" >> dev.log
  NODE_OPTIONS="--max-old-space-size=2048" node node_modules/.bin/next dev -p 3000 >> dev.log 2>&1
  EXIT=$?
  echo "=== Server exited with code $EXIT at $(date), restarting in 2s ===" >> dev.log
  sleep 2
done
