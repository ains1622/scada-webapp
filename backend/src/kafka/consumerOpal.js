import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "opal-consumer",
  brokers: ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "opal-group" });

export const runOpalConsumer = async (io) => {
  await consumer.connect();
  await consumer.subscribe({ topic: "Opal", fromBeginning: true });
  console.log("Consumer Opal suscrito al topic 'Opal'");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      console.log("Dato recibido Opal:", data);

      // Emitir vía WebSocket a un namespace o evento separado
      io.emit("opal_update", data);
    },
  });
};