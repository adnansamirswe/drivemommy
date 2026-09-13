FROM oven/bun:1 AS base
WORKDIR /app

# Copy everything from Docker context (apps/api/) to /app
COPY . .

# Install dependencies
RUN bun install --no-save

# Generate Prisma client
RUN bunx prisma generate --schema=prisma/schema.prisma

EXPOSE ${APP_PORT:-3000}
CMD ["sh", "-c", "bunx prisma migrate deploy --schema=prisma/schema.prisma && bun src/index.ts"]
