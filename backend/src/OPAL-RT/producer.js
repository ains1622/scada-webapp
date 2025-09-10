import { Kafka } from "kafkajs";
import connection from "./db.js";

const kafka = new Kafka({
  clientId: "opal-producer",
  brokers: ["kafka:9092"]
});

const producer = kafka.producer();

export async function enviarDatos() {
  await producer.connect();

  const [rows] = await connection.execute("SELECT * FROM mdc_meas");

  for (const row of rows) {
    await producer.send({
      topic: "opal-datos",
      messages: [{ value: JSON.stringify(row) }]
    });
  }

  console.log("Datos enviados a Kafka");
}
