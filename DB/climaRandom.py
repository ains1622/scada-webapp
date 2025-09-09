import psycopg2
import random
from datetime import datetime
import time

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="dashboard",
    user="admin",
    password="1234ñ$"
)

cursor = conn.cursor()

def generar_dato():
    """Genera un diccionario con valores random para la tabla clima"""
    return {
        "temperatura": round(random.uniform(10, 35), 2),
        "humedad": round(random.uniform(20, 100), 2),
        "presion": round(random.uniform(980, 1050), 2),
        "v_viento": round(random.uniform(0, 20), 2),
        "d_viento": random.choice(["N", "S", "E", "W", "NE", "NW", "SE", "SW"]),
        "indiceUV": round(random.uniform(0, 12), 2),
        "timestamp": datetime.now()
    }

def insertar_dato(dato):
    """Inserta un dato en la tabla clima"""
    sql = """
        INSERT INTO clima (temperatura, humedad, presion, v_viento, d_viento, indiceUV, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(sql, (
        dato["temperatura"],
        dato["humedad"],
        dato["presion"],
        dato["v_viento"],
        dato["d_viento"],
        dato["indiceUV"],
        dato["timestamp"]
    ))
    conn.commit()
# Bucle principal: genera un dato cada X segundos
try:
    while True:
        dato = generar_dato()
        insertar_dato(dato)
        time.sleep(2)  # espera 2 segundos antes de insertar otro dato
except KeyboardInterrupt:
    print("Interrumpido por usuario")
finally:
    cursor.close()
    conn.close()
