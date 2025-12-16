import { Kafka } from 'kafkajs';
import { insertSvPacket } from '../../src/db.js';

const kafka = new Kafka({ clientId: 'opal-db-consumer', brokers: ['kafka:9092'] });
const consumer = kafka.consumer({ groupId: 'opal-db' });

export const runOpalDbConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'Opal', fromBeginning: false });
  console.log("Consumer Opal DB suscrito al topic 'Opal'");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        // Log a compact summary (timestamp + values) to ease debugging
        const ts = data.timestamp_ms || data.received_at || null;
        let vals = data.values;
        if (Array.isArray(vals)) vals = vals.slice(0,3);
        if (typeof vals === 'object') vals = { ...vals };
        //console.log('DB writer received Opal message summary:', { ts, values: vals });
        await insertSvPacket(data);
      } catch (err) {
        console.error('Error processing Opal message in DB consumer:', err);
      }
    }
  });
};
