# ============================================================
# VoiceAI SaaS - Call Simulator Service
# Port: 3004
# ============================================================

FROM oven/bun:1

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests for layer caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY index.ts ./

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 bunuser \
    && chown -R bunuser:nodejs /app

USER bunuser

EXPOSE 3004

# Health check (socket.io doesn't have a plain HTTP health endpoint,
# so we check if the process is listening on the port)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3004/socket.io/?EIO=4\&transport=polling || exit 1

CMD ["bun", "index.ts"]
