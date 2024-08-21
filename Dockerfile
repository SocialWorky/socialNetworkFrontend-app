FROM node:22.1.0-alpine3.18 as dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]

FROM node:22.1.0-alpine3.18 as dev-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

FROM node:22.1.0-alpine3.18 as builder
WORKDIR /app

# Aceptar los argumentos de construcción
ARG NG_APP_BASE_URL
ARG NG_APP_API_URL
ARG NG_APP_CLIEN_ID_GOOGLE
ARG NG_APP_WSURL
ARG NG_APP_OPENCAGEAPIKEY
ARG NG_APP_APIGEOLOCATIONS
ARG NG_APP_APIWEATHERURL
ARG NG_APP_APIWEATHERTOKEN
ARG NG_APP_APIFILESERVICE
ARG NG_APP_APIMESSAGESERVICE
ARG NG_APP_APINOTIFICATIONCENTER
ARG NG_APP_GIPHYAPIKEY

# Definir las variables de entorno
ENV NG_APP_BASE_URL=${NG_APP_BASE_URL}
ENV NG_APP_API_URL=${NG_APP_API_URL}
ENV NG_APP_CLIEN_ID_GOOGLE=${NG_APP_CLIEN_ID_GOOGLE}
ENV NG_APP_WSURL=${NG_APP_WSURL}
ENV NG_APP_OPENCAGEAPIKEY=${NG_APP_OPENCAGEAPIKEY}
ENV NG_APP_APIGEOLOCATIONS=${NG_APP_APIGEOLOCATIONS}
ENV NG_APP_APIWEATHERURL=${NG_APP_APIWEATHERURL}
ENV NG_APP_APIWEATHERTOKEN=${NG_APP_APIWEATHERTOKEN}
ENV NG_APP_APIFILESERVICE=${NG_APP_APIFILESERVICE}
ENV NG_APP_APIMESSAGESERVICE=${NG_APP_APIMESSAGESERVICE}
ENV NG_APP_APINOTIFICATIONCENTER=${NG_APP_APINOTIFICATIONCENTER}
ENV NG_APP_GIPHYAPIKEY=${NG_APP_GIPHYAPIKEY}

COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --prod

FROM node:22.1.0-alpine3.18 as prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production --frozen-lockfile

FROM node:22.1.0-alpine3.18 as prod
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/www ./www

FROM nginx:alpine
COPY --from=prod /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
