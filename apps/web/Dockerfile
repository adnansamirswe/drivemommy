FROM node:22-alpine AS deps
WORKDIR /app
COPY . .
RUN npm install --no-audit --no-fund || true

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app .
ARG NEXT_PUBLIC_API_URL=https://drivemommy.bmgsl.com/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/next.config.* ./apps/web/
COPY --from=builder /app/apps/web/tsconfig.json ./apps/web/
EXPOSE ${PORT:-3000}
CMD ["sh", "-c", "cd apps/web && npm run start -- -p ${PORT:-3000}"]
