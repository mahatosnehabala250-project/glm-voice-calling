# ============================================================
# VoiceAI SaaS - Call Orchestrator Service
# Port: 3035
# ============================================================

FROM oven/bun:1

WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json ./
# No bun.lock — service has zero dependencies (uses only Bun built-ins)

# Install dependencies (if any)
RUN bun install --frozen-lockfile 2>/dev/null || true

# Copy source code
COPY index.ts ./

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 bunuser \
    && chown -R bunuser:nodejs /app

USER bunuser

EXPOSE 3035

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3035/ || exit 1

CMD ["bun", "index.ts"]
