FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── نسخ ملفات الـ workspace ──
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# ── نسخ المكتبات المشتركة ──
COPY lib/ ./lib/

# ── نسخ الـ packages ──
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/college-guide/ ./artifacts/college-guide/

# ── تثبيت الـ dependencies ──
RUN pnpm install --no-frozen-lockfile

# ── بناء الـ TypeScript libs ──
RUN pnpm run typecheck:libs

# ── بناء الـ frontend ──
RUN cd artifacts/college-guide && \
    npx vite build --config vite.config.prod.ts

# ── بناء الـ API server ──
RUN pnpm --filter @workspace/api-server run build

# ── نسخ الـ frontend داخل الـ API ──
RUN cp -r artifacts/college-guide/dist/public artifacts/api-server/dist/public

# ════════════════════════════════
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/package.json ./
COPY --from=base /app/lib/ ./lib/
COPY --from=base /app/artifacts/api-server/package.json ./artifacts/api-server/package.json

RUN pnpm install --no-frozen-lockfile --prod

# نسخ الـ build فقط
COPY --from=base /app/artifacts/api-server/dist/ ./artifacts/api-server/dist/

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
