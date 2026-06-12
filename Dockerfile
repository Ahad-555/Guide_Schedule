FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── نسخ ملفات الـ workspace ──
COPY pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# ── نسخ المكتبات المشتركة ──
COPY lib/ ./lib/

# ── نسخ الـ packages ──
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/college-guide/ ./artifacts/college-guide/
COPY scripts/ ./scripts/

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

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
