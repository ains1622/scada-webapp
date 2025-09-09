import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { testConexion, getData } from "./src/db.js";
import { runConsumer } from "./src/kafka/consumer.js";
import { sendApiDataToKafka } from "./src/kafka/producer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());

// Crear servidor HTTP + WebSocket
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

// Rutas REST
app.get("/", (req, res) => {
  res.send("Servidor Socket.IO funcionando");
});

app.get("/clima", async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// WebSocket
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.emit("clima_update", { msg: "Conectado al backend WS" });
});


server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
// Inicialización
(async () => {
  await testConexion();
  await runConsumer(io);       // Kafka -> WS
  sendApiDataToKafka();        // Producer simula datos
})();
