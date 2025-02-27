FROM node:22.1.0-alpine3.18 AS dev-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache build-base python3 && npm ci

FROM node:22.1.0-alpine3.18 AS builder
WORKDIR /app
COPY .env .env
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p src/assets/icons/
RUN npm run prepare-meta && npm run generate-manifest && npm run build --prod

FROM node:22.1.0-alpine3.18 AS generate-icons
WORKDIR /app
COPY .env .env
COPY --from=dev-deps /app/node_modules ./node_modules
COPY src src
RUN mkdir -p src/assets/icons/ && npm run generate-icons

FROM node:22.1.0-alpine3.18 AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production --frozen-lockfile

FROM nginx:alpine AS prod
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/www ./www

FROM nginx:alpine
COPY --from=prod /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]