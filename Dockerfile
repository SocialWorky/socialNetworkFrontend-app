FROM node:22.1.0-alpine3.18 AS dev-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.1.0-alpine3.18 AS builder
WORKDIR /app
COPY .env .env
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --prod

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