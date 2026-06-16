# Open Design web - Next.js 16 + Bun
#
# NOTE: next.config.ts does NOT set `output: "standalone"`, so this image
# does not use the standalone runner. Instead the runner stage carries the
# full app + node_modules and starts it with `bun start` (which runs
# `next start` per package.json). If you later add `output: "standalone"`
# to next.config.ts, switch the runner to copy `.next/standalone` and
# `.next/static` and run `node server.js`.

# ---- deps ----
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- builder ----
FROM oven/bun:1-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- runner ----
FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy production artifacts. We need node_modules because we are NOT using
# the standalone output - `next start` resolves deps from node_modules.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["bun", "start"]
