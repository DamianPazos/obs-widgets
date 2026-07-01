# --- Build ---
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Copiamos manifiestos para cachear la instalación
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @obs-widgets/server build

# --- Runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/server/package.json ./apps/server/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/apps/server/dist ./apps/server/dist

EXPOSE 8787
CMD ["node", "apps/server/dist/index.js"]
