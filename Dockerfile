FROM node:24-bookworm-slim AS client-build
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json ngsw-config.json tsconfig.json tsconfig.app.json ./
COPY src ./src
COPY public ./public
RUN npm run build -- --configuration production

FROM node:24-bookworm-slim AS server-build
WORKDIR /workspace/server

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/nest-cli.json server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8081
ENV STATIC_ROOT=/app/public
ENV MEDIA_ROOT=/app/media

COPY --from=server-build --chown=node:node /workspace/server/node_modules ./node_modules
COPY --from=server-build --chown=node:node /workspace/server/dist ./dist
COPY --from=client-build --chown=node:node /workspace/dist/forge-echo/browser ./public

RUN mkdir -p /app/media/tracks && chown -R node:node /app/media

USER node
EXPOSE 8081
CMD ["node", "dist/main.js"]
