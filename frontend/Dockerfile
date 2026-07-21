# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_NETWORK_CONCURRENCY=1 \
    NODE_OPTIONS=--dns-result-order=ipv4first

# Cache helps npm retry downloads without re-fetching the same tarballs.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-progress --prefer-offline

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
