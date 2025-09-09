import time
import requests
import psycopg2
from datetime import datetime

DB_PARAMS = {
    'host': 'db',
    'dbname': 'clima',
    'user': 'admin',
    'password': '1234ñ$',
    'port': 5432
}

API_URL = "http://44.195.41.161:8000"

response = requests.get(f"{API_URL}/health")
print("Estado API:", response.json())

def obtener_clima():
    response = requests.get(f"{API_URL}/data/estacion01/latest")
    datos = response.json()
    if datos["success"] and datos["data"]:
        ultimo = datos["data"][0]

def insertar_clima(conn, estacion, hora_update, temperatura, estado):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO clima (estacion, hora_update, temperatura, estado, fecha_envio)
            VALUES (%s, %s, %s, %s, %s)
        """, (estacion, hora_update, temperatura, estado, datetime.now()))
        conn.commit()

def main():
    conn = psycopg2.connect(**DB_PARAMS)
    while True:
        try:
            estacion, hora_update, temperatura, estado = obtener_clima()
            insertar_clima(conn, estacion, hora_update, temperatura, estado)
            print(f"[{datetime.now()}] Insertado: {estacion} | {hora_update} | {temperatura}°C | {estado}")
        except Exception as e:
            print("Error:", e)
        time.sleep(10)  # Esperar 10 segundos antes de la siguiente consulta (si es cada 1 segundo o < se bloquea la IP)

if __name__ == '__main__':
    main()
