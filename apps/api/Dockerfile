# API do Let's Go Run. Contexto de build = raiz do repositório:
#   docker build -f apps/api/Dockerfile -t app-de-corrida-api:latest .
# Imagem multi-arquitetura (a VPS é arm64). Roda sem root; os segredos entram só por variável de ambiente.
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo

# Dependências primeiro (cache): só os package.json e o lockfile.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/engine/package.json packages/engine/
COPY packages/shared/package.json packages/shared/
# Sem scripts: o "prepare" da raiz instala o hook do git (lefthook) e a imagem não tem git. Só o argon2
# (módulo nativo) e o esbuild precisam do passo de instalação, feito logo depois.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@passo/api..." && pnpm rebuild argon2 esbuild

COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @passo/api build
# Só as dependências de produção, num diretório solto.
# O argon2 traz o binário pronto (prebuilds) para x64 e arm64; não precisa compilar na imagem final.
RUN pnpm --filter @passo/api deploy --prod --ignore-scripts /out

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
# `node` (uid 1000) já vem na imagem: nada roda como root.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
