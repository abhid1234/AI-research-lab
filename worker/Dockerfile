FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy everything needed for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/db/ ./packages/db/
COPY apps/web/package.json ./apps/web/
COPY worker/ ./worker/

# Install all deps (pnpm will create workspace links)
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
EXPOSE 8080

CMD ["pnpm", "exec", "tsx", "worker/index.ts"]
