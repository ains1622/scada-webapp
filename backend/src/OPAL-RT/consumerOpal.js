import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "opal-consumer",
  brokers: ["kafka:9092"],
});

// This consumer delivers updates to websocket clients (fast path)
const consumer = kafka.consumer({ groupId: "opal-ws" });

export const runOpalConsumer = async (io) => {
  await consumer.connect();
  await consumer.subscribe({ topic: "Opal", fromBeginning: true });
  console.log("Consumer Opal suscrito al topic 'Opal'");

  // Buffer para promediar datos entrantes
  const buffers = new Map();
  const FLUSH_INTERVAL_MS = 1000;

  const flushBuffers = () => {
    if (buffers.size === 0) return;

    for (const [key, buf] of buffers.entries()) {
      if (buf.tsCount === 0) continue;

      // redondear a 3 decimales
      const round3 = (v) => Math.round(v * 1000) / 1000;

      const averaged = {
        svID: buf.svID,
        timestamp_ms: Math.round(buf.sumTs / buf.tsCount),
        voltaje: buf.vCount ? round3(buf.sumV / buf.vCount) : null,
        corriente: buf.iCount ? round3(buf.sumI / buf.iCount) : null,
        potencia: buf.pCount ? round3(buf.sumP / buf.pCount) : null
      };

      // emitir actualización promediada
      io.emit('opal_update', averaged);
    }

    // limpia los buffers
    buffers.clear();
  };

  const flushTimer = setInterval(flushBuffers, FLUSH_INTERVAL_MS);

  // limpieza al salir
  const cleanup = () => clearInterval(flushTimer);
  process.once('SIGINT', cleanup);
  process.once('exit', cleanup);

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        const tsMs = data.timestamp_ms || data.timestamp || null;
        let voltaje = null, corriente = null, potencia = null;
        const vals = data.values;
        if (vals !== undefined) {
          if (Array.isArray(vals)) {
            voltaje = vals[0] != null ? Number(vals[0]) : null;
            corriente = vals[1] != null ? Number(vals[1]) : null;
            potencia = vals[2] != null ? Number(vals[2]) : null;
          } else if (vals && typeof vals === 'object') {
            voltaje = Number(vals.voltage ?? vals.voltaje ?? vals.v ?? null);
            corriente = Number(vals.current ?? vals.corriente ?? vals.i ?? null);
            potencia = Number(vals.power ?? vals.potencia ?? vals.p ?? null);
          }
        } else {
          voltaje = data.voltaje != null ? Number(data.voltaje) : null;
          corriente = data.corriente != null ? Number(data.corriente) : null;
          potencia = data.potencia != null ? Number(data.potencia) : null;
        }

        const normalized = {
          svID: data.svID,
          timestamp_ms: tsMs || (data.timestamp ? new Date(data.timestamp).getTime() : Date.now()),
          voltaje,
          corriente,
          potencia
        };

        // acumula en el buffer correspondiente
        const key = normalized.svID || '__default__';
        let buf = buffers.get(key);
        if (!buf) {
          buf = {
            svID: normalized.svID,
            sumTs: 0,
            tsCount: 0,
            sumV: 0,
            vCount: 0,
            sumI: 0,
            iCount: 0,
            sumP: 0,
            pCount: 0
          };
          buffers.set(key, buf);
        }

        const ts = normalized.timestamp_ms || Date.now();
        buf.sumTs += ts;
        buf.tsCount++;

        if (normalized.voltaje != null) { buf.sumV += normalized.voltaje; buf.vCount++; }
        if (normalized.corriente != null) { buf.sumI += normalized.corriente; buf.iCount++; }
        if (normalized.potencia != null) { buf.sumP += normalized.potencia; buf.pCount++; }

      } catch (err) {
        console.error('Error processing Opal message in consumer:', err);
      }
    },
  });
};