import { Kafka } from "kafkajs";
import {pool} from "../db.js";

const kafka = new Kafka({
  clientId: "scada-backend",
  brokers: ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "scada-group" });

export const runConsumer = async (io) => {
  try {
    await consumer.connect();
    console.log("Consumer Kafka conectado");

    await consumer.subscribe({ topic: "clima-data", fromBeginning: true });
    console.log("Suscrito al topic 'clima-data'");

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        try {
          const query = `
            INSERT INTO clima (temperatura, humedad, presion, v_viento, d_viento, indiceuv, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          const values = [
            data.temperatura,
            data.humedad,
            data.presion,
            data.v_viento,
            data.d_viento,
            data.indiceuv,
            data.timestamp,
          ];
          await pool.query(query, values);
        } catch (err) {
          console.error("Error insertando en DB:", err);
        }
        // Emitir el evento principal y uno legacy para compatibilidad con clientes
        io.emit("clima_update", data);
        io.emit("clima", data);
        //console.log('Mensaje enviado:', data);
      },
    });
  } catch (err) {
    console.error("Error iniciando el consumer:", err);
  }
};
export default runConsumer;