import { Kafka } from 'kafkajs';

const kafka = new Kafka({ clientId: 'opal-producer', brokers: ['kafka:9092'] });
const producer = kafka.producer();

export const initOpalProducer = async () => {
  await producer.connect();
  console.log('Opal producer connected');
};

export const sendOpalMessage = async (payload) => {
  try {
    await producer.send({
      topic: 'Opal',
      messages: [{ value: JSON.stringify(payload) }]
    });
  } catch (err) {
    console.error('Error sending Opal message to Kafka:', err);
    throw err;
  }
};
