# Weather-Arb-Bot Dockerfile
# Base image: Bun runtime for high-performance TypeScript execution

FROM oven/bun:1.3.8-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Build stage
FROM base AS builder

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including dev dependencies for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript to JavaScript
# Note: Bun can run TypeScript directly, but we build for optimization
RUN bun build src/index.ts --outdir dist --target bun

# Production stage
FROM base AS runner

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 botgroup && \
    adduser --system --uid 1001 botuser

# Copy dependencies from deps stage
COPY --from=deps --chown=botuser:botgroup /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=botuser:botgroup /app/dist ./dist
COPY --from=builder --chown=botuser:botgroup /app/package.json ./

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R botuser:botgroup /app/logs

# Switch to non-root user
USER botuser

# Expose port (if needed for health checks or monitoring)
# EXPOSE 3000

# Health check (optional)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD bun run healthcheck.ts || exit 1

# Run the bot
CMD ["bun", "run", "dist/index.js"]
