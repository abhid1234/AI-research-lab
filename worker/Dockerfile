FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/
COPY worker/package.json ./worker/
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/worker/node_modules ./worker/node_modules
COPY packages/db/ ./packages/db/
COPY worker/ ./worker/
COPY tsconfig.base.json ./

CMD ["npx", "tsx", "worker/index.ts"]
