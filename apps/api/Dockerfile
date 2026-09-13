FROM oven/bun:1 AS base
WORKDIR /app

# Copy everything from repo root
COPY . .

# Install workspace dependencies
RUN bun install --frozen-lockfile || bun install

# Generate Prisma client
WORKDIR /app/apps/api
RUN bunx prisma generate

EXPOSE ${APP_PORT:-3000}
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/index.ts"]
