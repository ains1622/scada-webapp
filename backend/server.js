import express from "express";
import dotenv from "dotenv";
import { testConexion, getData, getDataFiltered, getAlertThreshold, upsertAlertThreshold } from "./src/db.js";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import { sendApiDataToKafka } from "./src/kafka/producerClima.js";
import { runConsumer } from "./src/kafka/consumerClima.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"], credentials: true },
  // path: '/socket.io' // puedes fijar path si lo necesitas
});

// Middleware para logear handshakes entrantes (útil para debug)
io.use((socket, next) => {
  try {
    console.log('Handshake incoming from', socket.handshake.address, 'origin:', socket.handshake.headers.origin);
  } catch (e) {
    // noop
  }
  next();
});

io.on("connection", async (socket) => {
  console.log("Cliente conectado:", socket.id, "handshake:", socket.handshake.address);

  // Enviar snapshot inicial de datos al cliente si está disponible
  try {
    const data = await getData();
    if (data && Array.isArray(data)) {
      socket.emit('initial', { clima: data });
    } else {
      socket.emit('initial', {});
    }
  } catch (err) {
    console.error('Error al obtener datos iniciales:', err);
    socket.emit('initial', {});
  }

  // envio de prueba inmediato para verificar conexión (puedes quitarlo luego)
  socket.emit("clima_update", { test: true, ts: new Date().toISOString() });

  socket.on('disconnect', (reason) => {
    console.log('Cliente desconectado:', socket.id, 'razón:', reason);
  });
});

// Heartbeat global opcional para depuración: emite cada 10s
setInterval(() => {
  io.emit('heartbeat', { ts: new Date().toISOString() });
}, 10000);

app.get("/", (req, res) => {
  res.send("Servidor Socket.IO funcionando");
});

app.get("/clima", async (req, res) => {
  try {
    const { start, end, agg, metric } = req.query;

    // Normalizar start/end a ISO y hacer end inclusivo
    let startISO = null;
    let endISO = null;
    if (start) {
      const ds = new Date(start);
      if (!isNaN(ds)) startISO = ds.toISOString();
    }
    if (end) {
      const de = new Date(end);
      if (!isNaN(de)) {
        // Hacer end inclusivo: añadir 999 ms para incluir registros con el mismo segundo/milisegundo
        de.setMilliseconds(de.getMilliseconds() + 999);
        endISO = de.toISOString();
      }
    }

    let data = await getDataFiltered({ start: startISO, end: endISO, agg });
     // Si piden una métrica concreta, devolver objetos reducidos { timestamp, <metric> }
     if (metric && Array.isArray(data)) {
       data = data.map(row => {
         // normalizar timestamp si viene con otro nombre
         const ts = row.timestamp || row.time || row.ts || null;
         return {
           timestamp: ts,
           // si la columna no existe, devolver null para mantener esquema consistente
           [metric]: row.hasOwnProperty(metric) ? row[metric] : null
         };
       });
     }
     res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// Obtener umbrales para un parámetro
app.get('/alertas/:param', async (req, res) => {
  try {
    const param = req.params.param;
    const row = await getAlertThreshold(param);
    if (!row) return res.json({ parametro: param, min: null, max: null });
    res.json({ parametro: param, min: row.min_value, max: row.max_value, updated_at: row.updated_at });
  } catch (err) {
    console.error('GET /alertas error', err);
    res.status(500).json({ error: 'Error al leer umbrales' });
  }
});

// Actualizar/crear umbrales para un parámetro
app.put('/alertas/:param', express.json(), async (req, res) => {
  try {
    const param = req.params.param;
    const { min, max } = req.body;
    if (typeof min !== 'number' || typeof max !== 'number') {
      return res.status(400).json({ error: 'min y max deben ser números' });
    }
    await upsertAlertThreshold(param, min, max);
    res.json({ ok: true, parametro: param, min, max });
  } catch (err) {
    console.error('PUT /alertas error', err);
    res.status(500).json({ error: 'Error al guardar umbrales' });
  }
});

// Endpoint para recibir paquetes SV desde el bridge UDP->HTTP
app.post('/api/sv', express.json(), (req, res) => {
  try {
    const payload = req.body;
    console.log('Received SV payload:', JSON.stringify(payload));

    // Emitir via socket.io para clientes conectados (si aplicable)
    io.emit('sv_update', payload);

    // Responder OK
    res.json({ ok: true });
  } catch (err) {
    console.error('Error handling /api/sv payload', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

server.listen(4000, "0.0.0.0", () => {
  console.log(`Servidor corriendo en el puerto 4000`);
});
(async () => {
  // Esperar a la conexión antes de enviar los datos
  await testConexion();
  await runConsumer(io);
  sendApiDataToKafka();
})()