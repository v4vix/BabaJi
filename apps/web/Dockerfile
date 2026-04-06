FROM node:20-alpine AS builder

ARG NEXT_PUBLIC_API_BASE=http://localhost:8101
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/astrology-kb/package.json packages/astrology-kb/package.json
COPY packages/reports/package.json packages/reports/package.json
COPY packages/video/package.json packages/video/package.json

RUN pnpm install --filter web... --no-frozen-lockfile

COPY apps/web apps/web
COPY packages packages

RUN pnpm --filter web build

FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE=http://localhost:8101 \
    PORT=3000

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

COPY --from=builder /repo/package.json /repo/pnpm-workspace.yaml /repo/tsconfig.base.json /repo/turbo.json ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/web ./apps/web
COPY --from=builder /repo/packages ./packages

EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
