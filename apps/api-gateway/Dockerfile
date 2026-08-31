# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/api-gateway/package.json ./apps/api-gateway/package.json

RUN pnpm install --frozen-lockfile --prod


# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/api-gateway/ ./apps/api-gateway/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter api-gateway build


# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api-gateway/node_modules ./apps/api-gateway/node_modules

# Copy built output
COPY --from=build /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=build /app/apps/api-gateway/package.json ./apps/api-gateway/package.json

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

WORKDIR /app/apps/api-gateway

CMD ["node", "dist/index.js"]
