FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS builder
WORKDIR /app

# Copy everything
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/db/ ./packages/db/
COPY apps/web/ ./apps/web/
COPY worker/package.json ./worker/

# Install deps (creates workspace links)
RUN pnpm install --frozen-lockfile

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @research-lab/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Static assets in apps/web/public/ — Next.js standalone output does NOT bundle
# these, so the runtime stage has to copy them explicitly. Without this, files
# like /og-image.png and /icon.svg 404 in prod.
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
