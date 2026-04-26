# ============================================================
# VoiceAI SaaS - Multi-stage Dockerfile for Next.js Main App
# ============================================================

# Stage 1: Dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json bun.lock ./

# Install dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js application (standalone output configured in next.config.ts)
# The build script also copies static assets and public/ into standalone
RUN bun run build

# Stage 3: Production runner (minimal image)
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 bunuser

# Copy the entire standalone build output
# (includes .next/static and public/ already copied by build script)
COPY --from=builder --chown=bunuser:nodejs /app/.next/standalone ./

# Copy Prisma schema for runtime migrations if needed
COPY --from=builder /app/prisma ./prisma

# Switch to non-root user
USER bunuser

# Expose port 3000
EXPOSE 3000

# Health check - hits the root API route
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/route || exit 1

# Start the Next.js server
CMD ["bun", "server.js"]
