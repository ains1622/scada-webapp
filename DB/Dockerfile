FROM postgres:latest

# Variables de entorno
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=1234ñ$
ENV POSTGRES_DB=dashboard

# Copiar script de inicialización
COPY init.sql /docker-entrypoint-initdb.d/
