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
// Incluye mapeos para la nueva API (quintay_davis / casona_davis) y compatibilidad con fuentes anteriores
const campoMap = {
  // Nuevos campos de la API de estaciones
  "temperatura_amb": "temperatura",
  "temperatura_tablero": "temperatura_tablero",
  "humedad_amb": "humedad",
  "humedad_tablero": "humedad_tablero",
  "presion_absoluta_hpa": "presion",
  "presion_absoluta_mbar": "presion",
  "presion_nmm_hpa": "presion_nmm_hpa",
  "punto_rocio": "punto_rocio",
  "viento_vel_inst": "v_viento",
  "viento_dir_grados": "d_viento",
  "lluvia_15m_mm": "lluvia_15m_mm",
  "lluvia_60m_mm": "lluvia_60m_mm",
  "lluvia_24h_mm": "lluvia_24h_mm",
  "lluvia_dia_mm": "lluvia",
  "rainfall_day_mm": "lluvia",
  "rainfall_last_60_min_mm": "lluvia_last_60_min",
  "lluvia_mes_mm": "lluvia_mes_mm",
  "lluvia_anio_mm": "lluvia_anio_mm",
  "lluvia_rate_max_mm_h": "lluvia_rate_max_mm_h",
  "lluvia_rate_mm_h": "lluvia_rate_mm_h",
  "rain_rate_last_mm": "rain_rate_last_mm",
  "bateria": "bateria",
  "wifi_rssi_dbm": "wifi_rssi_dbm",
  "4GSignalStrength": "4GSignalStrength",
  "PT100": "PT100_1_PT_100",
  "Piranometro5V": "Piranometro5V",
  "Piranometro": "Piranometro5V", // alias que usa la otra estación
  "UFreeSpace": "UFreeSpace",

  // Mantenemos compatibilidad con keys antiguas
  "Modbus_1_temperatura": "temperatura",
  "Modbus_1_humedad": "humedad",
  "Modbus_1_presion": "presion",
  "Modbus_1_w_speed": "v_viento",
  "Modbus_1_w_direccion": "d_viento",
  "uv": "indiceuv",
  "lluvia": "lluvia",
  "poa": "poa",
  "PT100_1_PT_100": "PT100_1_PT_100",
  "Polucion_MP1": "Polucion_MP1",
  "Polucion_MP2": "Polucion_MP2",
  "Polucion_MP3": "Polucion_MP3",
  "SysFreeSpace": "SysFreeSpace"
};

// Objeto donde vamos a ir guardando los últimos valores no nulos por estación
const registrosPorEstacion = {};

// Flag para evitar spam de logs sobre API_DATA_URLS malformado
let apiDataUrlsWarned = false;

// configurar fetch con cookie-jar
const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

const API_USER = process.env.API_USER;
const API_PASSWORD = process.env.API_PASSWORD;

const AUTH_URL = process.env.API_AUTH_URL;
const API_DATA_URLS_RAW = process.env.API_DATA_URLS;



/**
 * Devuelve un objeto stationKey -> url.
 * Soporta:
 *  - JSON mapping: '{"quintay_davis":"https://...","casona_davis":"..."}'
 *  - Lista key=value separada por comas: 'quintay_davis=https://...,casona_davis=https://...'
 *  - Lista de URLs separadas por comas: 'https://...,https://...'
 * Si no hay urls válidas retorna {} y loggea una sola vez.
 */
function getDataUrls() {
  if (API_DATA_URLS_RAW) {
    try {
      const parsed = JSON.parse(API_DATA_URLS_RAW);
      if (parsed && typeof parsed === 'object') {
        apiDataUrlsWarned = false;
        return parsed;
      }
      if (!apiDataUrlsWarned) {
        console.warn('API_DATA_URLS env var parsed but is not an object, attempting alternative parsing');
        apiDataUrlsWarned = true;
      }
    } catch (err) {
      // Intentar parsing alternativo: key=value o lista de URLs
      const parts = API_DATA_URLS_RAW.split(',').map(p => p.trim()).filter(Boolean);
      const mapping = {};
      for (const part of parts) {
        if (part.includes('=')) {
          const [k, v] = part.split('=').map(s => s.trim());
          if (k && v) mapping[k] = v;
        } else {
          // si es una URL, generar nombre a partir del path
          try {
            const u = new URL(part);
            let name = u.pathname.replace(/\/+/g, '_').replace(/\W+/g, '_').replace(/^_|_$/g, '');
            // Eliminar prefijos como "data_" y sufijos como "_latest"
            name = name.replace(/^data_/, '').replace(/_latest$/, '');
            if (!name) name = u.hostname;
            // evitar colisiones
            let idx = 1;
            let candidate = name;
            while (mapping[candidate]) {
              candidate = `${name}_${idx++}`;
            }
            mapping[candidate] = part;
          } catch (e) {
            // ignorar partes inválidas
          }
        }
      }

      if (Object.keys(mapping).length > 0) {
        apiDataUrlsWarned = false;
        return mapping;
      }

      if (!apiDataUrlsWarned) {
        console.warn('API_DATA_URLS invalid or empty; no URLs para consultar');
        apiDataUrlsWarned = true;
      }
    }
  } else {
    if (!apiDataUrlsWarned) {
      console.warn('No API_DATA_URLS configured; no URLs para consultar.');
      apiDataUrlsWarned = true;
    }
  }

  return {};
} 

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

      const urls = getDataUrls();
      const entries = Object.entries(urls);
      if (entries.length === 0) {
        // No hay URLs configuradas, saltar este ciclo
        return;
      }

      // Ejecutar fetchs en paralelo para todas las estaciones configuradas
      await Promise.all(entries.map(async ([stationKey, url]) => {
        try {
          const res = await fetchWithCookies(url);

          if (res.status === 401) {
            console.warn(`${stationKey} (${url}) 401 recibido, reautenticando...`);
            logged = await loginToApi();
            if (!logged) return;
            const retry = await fetchWithCookies(url);
            if (!retry.ok) throw new Error(`API retry failed ${retry.status} for ${url}`);
            const jsonRetry = await retry.json();
            processApiJson(jsonRetry, stationKey);
            return;
          }

          if (!res.ok) {
            throw new Error(`Error fetching API for ${stationKey} at ${url}: ${res.status}`);
          }

          const json = await res.json();
          processApiJson(json, stationKey);
        } catch (err) {
          console.error(`Error obteniendo datos para ${stationKey} (${url}):`, err);
        }
      }));
    } catch (error) {
      console.error("Error en el polling de APIs:", error);
    }
  }, 1000);
};

// extraer procesamiento para evitar repetir código y manejar por estación
function processApiJson(json, stationFromUrl) {
  try {
    const station = stationFromUrl ?? json.bucket ?? (json.data && json.data[0] && json.data[0].bucket) ?? "unknown";

    if (json.success && json.data && json.data.length > 0) {
      registrosPorEstacion[station] = registrosPorEstacion[station] || {};

      for (const item of json.data) {
        // Guardamos los últimos valores no nulos para esta estación
        Object.entries(campoMap).forEach(([apiKey, mappedKey]) => {
          if (item[apiKey] !== null && item[apiKey] !== undefined) {
            registrosPorEstacion[station][mappedKey] = item[apiKey] * 10;
          }
        });
      }

      // Sólo requerimos un subconjunto mínimo de campos para enviar (evitar esperar todos los mapeos)
      const REQUIRED_FIELDS = ["temperatura", "humedad", "presion"];
      const requiredOk = REQUIRED_FIELDS.every(
        (k) => registrosPorEstacion[station][k] !== undefined && registrosPorEstacion[station][k] !== null
      );

      if (!requiredOk) {
        return; // saltar envío hasta tener los mínimos
      }

      // Asegurarnos de que el objeto tenga todas las claves mapeadas (llenar con null cuando falten)
      Object.values(campoMap).forEach(k => {
        if (registrosPorEstacion[station][k] === undefined) registrosPorEstacion[station][k] = null;
      });

      // Aseguramos timestamp
      registrosPorEstacion[station].timestamp = json.data[json.data.length - 1]._time ?? new Date().toISOString();

      // Añadimos identificador de estación/bucket para que el frontend pueda filtrar
      registrosPorEstacion[station].station = station;

      producer.send({
        topic: "clima-data",
        messages: [{ value: JSON.stringify(registrosPorEstacion[station]) }],
      }).catch(err => console.error("Error enviando a Kafka:", err));
    }
  } catch (err) {
    console.error("Error procesando json API:", err);
  }
}

// Getter para exponer el último registro por estación
export const getLatestClima = () => registrosPorEstacion;
