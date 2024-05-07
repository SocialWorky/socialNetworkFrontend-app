# FROM node:20.12.2-alpine3.18 as dev
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm install
# COPY . .
# CMD ["npm", "run", "start"]

# FROM node:20.12.2-alpine3.18 as dev-deps
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm install --frozen-lockfile

# FROM node:20.12.2-alpine3.18 as builder
# WORKDIR /app
# COPY --from=dev-deps /app/node_modules ./node_modules
# COPY . .
# RUN npm run build

# FROM node:20.12.2-alpine3.18 as prod-deps
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm install --production --frozen-lockfile

# FROM node:20.12.2-alpine3.18 as prod
# WORKDIR /app
# ENV APP_VERSION=${APP_VERSION}
# COPY --from=prod-deps /app/node_modules ./node_modules
# COPY --from=builder /app/www ./www

# FROM nginx:alpine
# COPY --from=prod /app/www /usr/share/nginx/html
# EXPOSE ${APP_PORT}
# CMD ["nginx", "-g", "daemon off;"]


# Etapa de construcción (build stage)
# FROM node:20.12.2-alpine3.18 as builder

# # Establece el directorio de trabajo
# WORKDIR /app

# # Copia los archivos de configuración
# COPY package.json package-lock.json ./

# # Instala las dependencias
# RUN npm install

# # Copia el código fuente de la aplicación
# COPY . .

# # Compila la aplicación
# RUN npm run build --prod

# # Etapa de producción
# FROM nginx:alpine

# # Copia los archivos generados en la etapa de construcción a la ubicación de despliegue de Nginx
# COPY --from=builder /app/www /usr/share/nginx/html

# # Expone el puerto 80 para permitir el acceso a la aplicación desde el exterior
# EXPOSE ${APP_PORT}

# # Comando para iniciar el servidor Nginx
# CMD ["nginx", "-g", "daemon off;"]

FROM node:20.12.2-alpine3.18 as builder
WORKDIR /app/src
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM node:20.12.2-alpine3.18 
WORKDIR /usr/app
COPY --from=build /app/src/www ./
CMD node server.mjs
EXPOSE 4100