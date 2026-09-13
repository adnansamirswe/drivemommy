FROM oven/bun:1 AS base
WORKDIR /app

# Copy entire repo
COPY . .

# Install workspace dependencies
RUN bun install --frozen-lockfile || bun install

# Generate Prisma client
WORKDIR /app/apps/api
RUN bunx prisma generate --schema=./prisma/schema.prisma

EXPOSE ${APP_PORT:-3000}
CMD ["sh", "-c", "bunx prisma migrate deploy --schema=./prisma/schema.prisma && bun src/index.ts"]
