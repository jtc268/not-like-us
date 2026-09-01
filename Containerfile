FROM node:22.22.0-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run validate && npm run lint && npm run build

FROM build AS test

RUN node -e "const fs=require('node:fs'); for (const p of ['dist/server/index.js','dist/server/wrangler.json','dist/client/not-like-us-banner.png']) if (!fs.existsSync(p)) process.exit(1)"

FROM node:22.22.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    HOME=/tmp \
    XDG_CONFIG_HOME=/tmp/.config \
    WRANGLER_SEND_METRICS=false \
    NO_UPDATE_NOTIFIER=1

WORKDIR /app
RUN groupadd --gid 10001 notlikeus \
    && useradd --uid 10001 --gid 10001 --home-dir /nonexistent --no-create-home --shell /usr/sbin/nologin notlikeus

COPY --from=build --chown=10001:10001 /app/dist ./dist
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/package.json ./package.json

USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:8080/healthz').then(r=>r.json()).then(x=>{if(x.status!=='ok')process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "exec ./node_modules/.bin/wrangler dev --ip 0.0.0.0 --port 8080 --config dist/server/wrangler.json --var ADORE_RELEASE:${ADORE_RELEASE} --show-interactive-dev-session=false"]
