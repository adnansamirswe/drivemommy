FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock* ./

# Copy API package.json
COPY apps/api/package.json ./apps/api/package.json

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/api
RUN bunx prisma generate

# Copy API source
COPY apps/api .

EXPOSE ${APP_PORT:-3000}
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/index.ts"]
