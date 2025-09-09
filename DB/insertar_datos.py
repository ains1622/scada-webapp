import psycopg2
from datetime import datetime
import random
import time

# Conexión a PostgreSQL
conn = psycopg2.connect(
    dbname="datos",
    user="postgres",
    password="123",
    host="db",
    port="5432"
)

cursor = conn.cursor()

def generar_datos():
    return {
        'irradianza': round(random.uniform(100.0, 1000.0), 2),
        'voltajes': round(random.uniform(210.0, 240.0), 2),
        'corriente': round(random.uniform(5.0, 20.0), 2),
        'potencia': round(random.uniform(500.0, 5000.0), 2)
    }

try:
    while True:
        datos = generar_datos()
        timestamp = datetime.utcnow()

        for tabla, valor in datos.items():
            cursor.execute(
                f"INSERT INTO {tabla} (valor, timestamp) VALUES (%s, %s);",
                (valor, timestamp)
            )
        
        conn.commit()

        time.sleep(0.5)

except KeyboardInterrupt:
    print("Detenido por el usuario.")

finally:
    cursor.close()
    conn.close()
