# Images de production : `api` (API Node compilée) et `web` (Caddy : site statique + HTTPS).
# Construites par docker-compose.prod.yml.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build -w apps/api && npm run build -w apps/web
# Dépendances d'exécution seulement pour l'image de l'API.
RUN npm prune --omit=dev

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
WORKDIR /app/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]

FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
