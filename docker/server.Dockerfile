FROM node:26-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@10.0.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig*.json ./
COPY shared ./shared
COPY server ./server
COPY docker/server-entrypoint.sh /app/docker/server-entrypoint.sh
WORKDIR /app/server
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm exec prisma generate
EXPOSE 3000
ENTRYPOINT ["sh", "/app/docker/server-entrypoint.sh"]
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
