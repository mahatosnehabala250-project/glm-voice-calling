# ============================================================
# VoiceAI SaaS - Gemini AI Integration Service
# Port: 3032
# ============================================================

FROM oven/bun:1

WORKDIR /app

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

EXPOSE 3032

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3032/ || exit 1

CMD ["bun", "index.ts"]
