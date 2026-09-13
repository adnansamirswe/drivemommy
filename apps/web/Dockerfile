FROM node:22-alpine AS deps
WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock* ./

# Copy web package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm install --no-audit --no-fund || true

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web .
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.* ./
EXPOSE ${PORT:-3000}
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
