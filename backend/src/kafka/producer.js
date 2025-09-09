import { Kafka } from "kafkajs";
import fetch from "node-fetch";

const kafka = new Kafka({
  clientId: "scada-backend",
  brokers: ["kafka:9092"],
});

const producer = kafka.producer();

// Campos que queremos enviar a Kafka, mapeando nombres de la API a los que espera tu frontend
const campoMap = {
  "Modbus_1_temperatura": "temperatura",
  "Modbus_1_humedad": "humedad",
  "Modbus_1_presion": "presion",
  "Modbus_1_w_speed": "v_viento",
  "Modbus_1_w_direccion": "d_viento",
  "uv": "indiceuv",
  "lluvia": "lluvia",
  "poa": "poa",
  "4GSignalStrength": "4GSignalStrength",
  "PT100_1_PT_100": "PT100_1_PT_100",
  "Polucion_MP1": "Polucion_MP1",
  "Polucion_MP2": "Polucion_MP2",
  "Polucion_MP3": "Polucion_MP3",
  "SysFreeSpace": "SysFreeSpace",
  "UFreeSpace": "UFreeSpace"
};

// Objeto donde vamos a ir guardando los últimos valores no nulos
const ultimoRegistro = {};

export const sendApiDataToKafka = async () => {
  await producer.connect();
  console.log("Producer Kafka conectado correctamente");

  const API_URL = "http://44.195.41.161:8000/data/estacion01/latest"; 

  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();

      if (json.success && json.data && json.data.length > 0) {
        for (const item of json.data) {
          // Guardamos los últimos valores no nulos
          Object.entries(campoMap).forEach(([apiKey, mappedKey]) => {
            if (item[apiKey] !== null && item[apiKey] !== undefined) {
              ultimoRegistro[mappedKey] = item[apiKey];
            }
          });
        }

        // Solo enviamos si todos los campos esperados tienen valor
        const todosLosCampos = Object.values(campoMap).every(
          (key) => ultimoRegistro[key] !== undefined
        );

        if (todosLosCampos) {
          // Aseguramos timestamp
          ultimoRegistro.timestamp = json.data[json.data.length - 1]._time ?? new Date().toISOString();

          await producer.send({
            topic: "clima-data",
            messages: [{ value: JSON.stringify(ultimoRegistro) }],
          });

          //console.log("Registro enviado a Kafka:", ultimoRegistro);
        }
      }
    } catch (error) {
      console.error("Error obteniendo datos de la API:", error);
    }
  }, 1000);
};
