FROM oven/bun:1 AS base
WORKDIR /app

# Install deps
COPY package.json bun.lock* ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile || bun install

# Generate Prisma client
RUN bunx prisma generate

# Copy source
COPY . .

EXPOSE ${APP_PORT:-3000}
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/index.ts"]
