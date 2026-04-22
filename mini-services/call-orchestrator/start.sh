#!/bin/bash
cd "$(dirname "$0")"
ENV_FILE="/home/z/my-project/.env"
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    export "$key=$value"
  done < "$ENV_FILE"
fi
exec bun run --bun index.ts
