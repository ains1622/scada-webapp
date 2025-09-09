import { Kafka } from "kafkajs";
import fetch from "node-fetch";

const kafka = new Kafka({
  clientId: "scada-backend",
  brokers: ["kafka:9092"],
});

const producer = kafka.producer();

export const sendApiDataToKafka = async () => {
  await producer.connect();
  console.log("Producer Kafka conectado correctamente");

  // Ejemplo de endpoint de la API
  const API_URL = "http://44.195.41.161:8000/data/estacion01/latest"; 

  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();

      if (json.success && json.data && json.data.length > 0) {
        const apiData = json.data[0];

        // Formateamos los datos
        const dataToSend = {
          temperatura: apiData.Modbus_1_temperatura ?? 0,
          humedad: apiData.Modbus_1_humedad ?? 0,
          presion: apiData.Modbus_1_presion ?? 0,
          v_viento: apiData.Modbus_1_w_speed ?? 0,
          d_viento: apiData.Modbus_1_w_direccion ?? 0,
          indiceuv: apiData.uv ?? 0,
          timestamp: apiData._time ?? new Date().toISOString(),
        };

        await producer.send({
          topic: "clima-data",
          messages: [{ value: JSON.stringify(dataToSend) }],
        });
      }
    } catch (error) {
      console.error("Error obteniendo datos de la API:", error);
    }
  }, 5000); // cada 5 segundos
};
