# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
# El workspace usa node-linker=hoisted. Instalar el lockfile completo garantiza
# que TypeScript y los @types del backend existan durante la etapa de build.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM dependencies AS source

COPY apps/api apps/api

FROM source AS build

RUN pnpm --filter @rankingup/api build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node --from=build /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=build /app/apps/api/public ./apps/api/public
COPY --chown=node:node --from=build /app/apps/api/package.json ./apps/api/package.json

USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
