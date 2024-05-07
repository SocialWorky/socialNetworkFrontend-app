FROM node:20.12.2-alpine3.18 as dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN node mynodejs.cjs
CMD ["npm", "run", "start"]

FROM node:20.12.2-alpine3.18 as dev-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

FROM node:20.12.2-alpine3.18 as builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --prod

FROM node:20.12.2-alpine3.18 as prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production --frozen-lockfile

FROM node:20.12.2-alpine3.18 as prod
WORKDIR /app
ENV APP_VERSION=${APP_VERSION}
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/www ./www

FROM nginx:alpine
COPY --from=prod /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
