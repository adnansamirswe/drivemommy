FROM oven/bun:1 AS base
WORKDIR /app

COPY . .

# Debug: list what we got
RUN find . -maxdepth 3 -type f | head -40

RUN cd apps/api && bun install --frozen-lockfile || bun install
RUN cd apps/api && bunx prisma generate --schema=prisma/schema.prisma

EXPOSE ${APP_PORT:-3000}
CMD ["sh", "-c", "cd apps/api && bunx prisma migrate deploy --schema=prisma/schema.prisma && bun src/index.ts"]
