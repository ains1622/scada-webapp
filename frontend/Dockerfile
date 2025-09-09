# frontend/Dockerfile
FROM node:18

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

# Exponer puerto de React
EXPOSE 3000

# Comando por defecto para desarrollo
CMD ["yarn", "start"]
