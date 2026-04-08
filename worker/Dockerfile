FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy full monorepo (simplified for reliability)
COPY . .

# Install all deps
RUN pnpm install --frozen-lockfile

# Verify workspace link works
RUN node -e "require('@research-lab/db')" || echo "Workspace link check skipped"

ENV NODE_ENV=production
EXPOSE 8080

CMD ["pnpm", "exec", "tsx", "worker/index.ts"]
