# syntax=docker/dockerfile:1

# --- 1. Dépendances ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
# .npmrc : legacy-peer-deps (pair facultatif de better-auth en conflit avec vitest)
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 \
    && npm ci

# --- 2. Compilation Next.js (serveur autonome) ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- 3. Image d'exécution (sans outils de compilation, utilisateur non root) ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3300 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Migrations SQL de la base : appliquées au démarrage de l'application.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3300/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
