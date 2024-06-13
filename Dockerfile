FROM node:22.1.0-alpine3.18 as dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]

FROM node:22.1.0-alpine3.18 as dev-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:22.1.0-alpine3.18 as builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --prod

FROM node:22.1.0-alpine3.18 as prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production

FROM node:22.1.0-alpine3.18 as prod
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/www ./www

FROM nginx:alpine
COPY --from=prod /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
