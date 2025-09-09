import psycopg2
import time
import random

conn = psycopg2.connect(
    host="db",  # el nombre del contenedor PostgreSQL
    database="sensor_data",
    user="sensor_data",
    password="123"
)
cursor = conn.cursor()

while True:
    value = random.randint(1, 100)
    cursor.execute("INSERT INTO voltajes (radianza) VALUES (%s);", (value,))
    conn.commit()
    print(f"Inserta: {value}")
    time.sleep(2)