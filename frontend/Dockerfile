# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_FETCH_TIMEOUT=1200000 \
    NPM_CONFIG_FETCH_RETRIES=10 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=10 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=30000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=600000 \
    NPM_CONFIG_NETWORK_CONCURRENCY=1 \
    NPM_CONFIG_MAXSOCKETS=1 \
    NODE_OPTIONS=--dns-result-order=ipv4first

# Cache helps npm retry downloads without re-fetching the same tarballs.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-progress --prefer-offline --fetch-timeout=1200000 --fetch-retries=10

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
