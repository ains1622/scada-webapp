import express from "express";
import dotenv from "dotenv";
import { testConexion, getData } from "./src/db.js";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import { sendApiDataToKafka } from "./src/kafka/producer.js";
import { runConsumer } from "./src/kafka/consumer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});


io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.emit("clima_update", { test: true });
});
app.get("/", (req, res) => {
  res.send("Servidor Socket.IO funcionando");
});

// Enpoint para ver el historico de los datos
app.get("/clima", async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
(async () => {
  // Esperar a la conexión antes de enviar los datos
  await testConexion();
  await runConsumer(io);
  sendApiDataToKafka();
})()