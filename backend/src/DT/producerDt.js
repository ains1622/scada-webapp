import { Kafka } from 'kafkajs';

const kafka = new Kafka({ clientId: 'dt-producer', brokers: ['kafka:9092'] });
const producer = kafka.producer();

export const initDtProducer = async () => {
    await producer.connect();
    console.log('Dt producer connected');
};

export const sendDtMessage = async (payload) => {
    try {
        await producer.send({
            topic: 'Dt',
            messages: [{ value: JSON.stringify(payload) }]
        });
    } catch (err) {
        console.error('Error sending Dt message to Kafka:', err);
        throw err;
    }
};
