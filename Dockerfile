FROM node:22.1.0-alpine3.18 AS dev-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache build-base python3 && npm ci

FROM node:22.1.0-alpine3.18 AS builder
WORKDIR /app
COPY .env .env
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run prepare-meta && npm run generate-manifest && npm run build --prod

FROM node:22.1.0-alpine3.18 AS generate-icons
WORKDIR /app
COPY .env .env
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p src/assets/icons/ && chmod -R 777 src/assets/icons/
RUN apk add --no-cache vips-dev build-base --update-cache --repository https://alpine.global.ssl.fastly.net/alpine/v3.10/community/
RUN npm install axios sharp
RUN npm run generate-icons

FROM node:22.1.0-alpine3.18 AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production --frozen-lockfile

FROM nginx:alpine AS prod
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/www ./www

FROM nginx:alpine
RUN mkdir -p /usr/share/nginx/html/assets/icons/
COPY --from=generate-icons /app/src/assets/icons /usr/share/nginx/html/assets/icons
COPY --from=prod /app/www /usr/share/nginx/html

RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]