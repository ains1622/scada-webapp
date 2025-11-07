import { Kafka } from "kafkajs";
import fetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";

const kafka = new Kafka({
  clientId: "scada-backend",
  brokers: ["kafka:9092"],
});

const producer = kafka.producer();

// Campos que queremos enviar a Kafka, mapeando nombres de la API a los que espera tu frontend
const campoMap = {
  "Modbus_1_temperatura": "temperatura",
  "Modbus_1_humedad": "humedad",
  "Modbus_1_presion": "presion",
  "Modbus_1_w_speed": "v_viento",
  "Modbus_1_w_direccion": "d_viento",
  "uv": "indiceuv",
  "lluvia": "lluvia",
  "poa": "poa",
  "4GSignalStrength": "4GSignalStrength",
  "PT100_1_PT_100": "PT100_1_PT_100",
  "Polucion_MP1": "Polucion_MP1",
  "Polucion_MP2": "Polucion_MP2",
  "Polucion_MP3": "Polucion_MP3",
  "SysFreeSpace": "SysFreeSpace",
  "UFreeSpace": "UFreeSpace"
};

// Objeto donde vamos a ir guardando los últimos valores no nulos
const ultimoRegistro = {};

// configurar fetch con cookie-jar
const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

const API_USER = process.env.API_USER;
const API_PASSWORD = process.env.API_PASSWORD;

const AUTH_URL = process.env.API_AUTH_URL;
const API_URL = process.env.API_DATA_URL;

async function loginToApi() {
  try {
    const res = await fetchWithCookies(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: API_USER, password: API_PASSWORD }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(`Login failed: ${res.status} ${JSON.stringify(json)}`);
    }
    console.log("Login a API exitoso");
    return true;
  } catch (err) {
    console.error("Error en login API:", err);
    return false;
  }
}

export const sendApiDataToKafka = async () => {
  await producer.connect();
  console.log("Producer Kafka conectado correctamente");

  // intentar login inicial
  let logged = await loginToApi();
  if (!logged) {
    console.warn("No se pudo autenticar inicialmente. Se intentará en cada polling.");
  }

  setInterval(async () => {
    try {
      // si no estamos autenticados, intentar login antes de la petición
      if (!logged) {
        logged = await loginToApi();
        if (!logged) return; // saltar intento si sigue sin auth
      }

      const res = await fetchWithCookies(API_URL);
      // si recibimos 401 intentar re-login y reintentar una vez
      if (res.status === 401) {
        console.warn("401 recibido, reautenticando...");
        logged = await loginToApi();
        if (!logged) return;
        // reintentar petición
        // eslint-disable-next-line no-await-in-loop
        const retry = await fetchWithCookies(API_URL);
        if (!retry.ok) throw new Error(`API retry failed ${retry.status}`);
        const jsonRetry = await retry.json();
        processApiJson(jsonRetry);
        return;
      }

      if (!res.ok) {
        throw new Error(`Error fetching API: ${res.status}`);
      }

      const json = await res.json();
      processApiJson(json);
    } catch (error) {
      console.error("Error obteniendo datos de la API:", error);
    }
  }, 1000);
};

// extraer procesamiento para evitar repetir código
function processApiJson(json) {
  try {
    if (json.success && json.data && json.data.length > 0) {
      for (const item of json.data) {
        // Guardamos los últimos valores no nulos
        Object.entries(campoMap).forEach(([apiKey, mappedKey]) => {
          if (item[apiKey] !== null && item[apiKey] !== undefined) {
            ultimoRegistro[mappedKey] = item[apiKey];
          }
        });
      }

      // Solo enviamos si todos los campos esperados tienen valor
      const todosLosCampos = Object.values(campoMap).every(
        (key) => ultimoRegistro[key] !== undefined
      );

      if (todosLosCampos) {
        // Aseguramos timestamp
        ultimoRegistro.timestamp = json.data[json.data.length - 1]._time ?? new Date().toISOString();

        producer.send({
          topic: "clima-data",
          messages: [{ value: JSON.stringify(ultimoRegistro) }],
        }).catch(err => console.error("Error enviando a Kafka:", err));
      }
    }
  } catch (err) {
    console.error("Error procesando json API:", err);
  }
}
