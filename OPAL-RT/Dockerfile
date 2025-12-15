FROM python:3.11-slim

# Instalar utilidades necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	netcat-openbsd \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements y script
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY sv_subscriber_bridge.py /app/sv_subscriber_bridge.py

# Exponer puerto (documentacional, en host network mode se atenderá directamente)
EXPOSE 5000/udp

CMD ["python", "/app/sv_subscriber_bridge.py"]
