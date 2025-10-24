import express from "express";
import dotenv from "dotenv";
import { testConexion, getData, getDataFiltered } from "./src/db.js";
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
    const data = await getDataFiltered({ start, end, agg });
    // Si el cliente pide sólo una métrica específica, devolverla tal cual (frontend puede manejar)
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Error en la base de datos" });
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