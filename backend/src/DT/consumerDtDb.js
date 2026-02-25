import { Kafka } from 'kafkajs';
import { insertDtPacket } from '../../src/db.js';

const kafka = new Kafka({ clientId: 'dt-db-consumer', brokers: ['kafka:9092'] });
const consumer = kafka.consumer({ groupId: 'dt-db' });

export const runDtDbConsumer = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'Dt', fromBeginning: false });
    console.log("Consumer Dt DB suscrito al topic 'Dt'");

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const data = JSON.parse(message.value.toString());
                await insertDtPacket(data);
            } catch (err) {
                console.error('Error processing Dt message in DB consumer:', err);
            }
        }
    });
};
