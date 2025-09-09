# backend/Dockerfile
FROM node:18

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y yarn.lock
COPY package.json yarn.lock ./

# Instalar dependencias con Yarn
RUN yarn install

# Copiar el resto del código
COPY . .

# Instalar nodemon global para desarrollo
RUN yarn global add nodemon

# Exponer puerto del backend
EXPOSE 4000

# Comando por defecto para desarrollo
CMD ["nodemon", "server.js"]
