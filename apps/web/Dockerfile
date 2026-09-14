FROM node:22-alpine AS deps
WORKDIR /app
COPY . .
RUN npm install --no-audit --no-fund 2>/dev/null || true

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app .
ARG NEXT_PUBLIC_API_URL=https://mergedrive.bmgsl.com/api
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
