import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
 
const testConexion = async () => {
   try {
     const client = await pool.connect();
     console.log('Conexión a la base de datos exitosa');
     client.release();
   } catch (error) {
     console.error('Error en la conexión a la base de datos:', error);
   }
};
 
const getData = async () => {
   try {
     const result = await pool.query('SELECT * FROM clima');
     return result.rows;
   } catch (error) {
     console.error('Error fetching data:', error);
     throw error;
   }
};
 
const getDataFiltered = async ({ start, end, agg } = {}) => {
   try {
     const values = [];
     let where = '';
     if (start) {
       values.push(start);
       where += ` AND timestamp >= $${values.length}`;
     }
     if (end) {
       values.push(end);
       where += ` AND timestamp <= $${values.length}`;
     }
 
     if (agg && agg !== 'raw') {
       // usar date_trunc para agregación por minute/hour/day
       const valid = agg === 'minute' || agg === 'hour' || agg === 'day';
       const period = valid ? agg : 'hour';
       const sql = `SELECT date_trunc('${period}', timestamp) AS timestamp,
         AVG(temperatura) AS temperatura,
         AVG(humedad) AS humedad,
         AVG(presion) AS presion,
         AVG(v_viento) AS v_viento,
         AVG(d_viento) AS d_viento,
         AVG(indiceuv) AS indiceuv
         FROM clima
         WHERE 1=1 ${where}
         GROUP BY 1
         ORDER BY 1 ASC`;
       const res = await pool.query(sql, values);
       return res.rows;
     }
 
     // raw rows
     const sql = `SELECT * FROM clima WHERE 1=1 ${where} ORDER BY timestamp ASC`;
     const res = await pool.query(sql, values);
     return res.rows;
   } catch (error) {
     console.error('Error fetching filtered data:', error);
     throw error;
   }
};
 
async function getAlertThreshold(parametro) {
   const res = await pool.query(
     'SELECT min_value, max_value, updated_at FROM alertas WHERE parametro = $1',
     [parametro]
   );
   return res.rows[0] || null;
}
 
async function upsertAlertThreshold(parametro, minValue, maxValue) {
   await pool.query(
     `INSERT INTO alertas(parametro, min_value, max_value, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (parametro) DO UPDATE
        SET min_value = EXCLUDED.min_value,
            max_value = EXCLUDED.max_value,
            updated_at = now()`,
     [parametro, minValue, maxValue]
   );
   return getAlertThreshold(parametro);
}

// Obtener registros de la tabla `central` (OPAL). Soporta filtros opcionales y agregación (agg = raw|minute|hour|day)
async function getCentral({ start, end, agg = 'raw', limit } = {}) {
  try {
    const values = [];
    let where = '';
    if (start) {
      values.push(start);
      where += ` AND timestamp >= $${values.length}`;
    }
    if (end) {
      values.push(end);
      where += ` AND timestamp <= $${values.length}`;
    }

    // Agregación tipo date_trunc si se solicita
    if (agg && agg !== 'raw') {
      const valid = agg === 'minute' || agg === 'hour' || agg === 'day';
      const period = valid ? agg : 'hour';
      const sql = `SELECT date_trunc('${period}', timestamp) AS timestamp,
        AVG(voltaje) AS voltaje,
        AVG(corriente) AS corriente,
        AVG(potencia) AS potencia
        FROM central
        WHERE 1=1 ${where}
        GROUP BY 1
        ORDER BY 1 ASC`;
      const res = await pool.query(sql, values);
      return res.rows;
    }

    // Raw rows con límite (por defecto 1000)
    const lim = limit && Number(limit) > 0 ? Number(limit) : 1000;
    const sql = `SELECT id, voltaje, corriente, potencia, timestamp FROM central WHERE 1=1 ${where} ORDER BY timestamp ASC LIMIT ${lim}`;
    const res = await pool.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error('Error fetching central data:', err);
    throw err;
  }
}

// Wrapper ligero por compatibilidad
async function getCentralFiltered(opts = {}) {
  return getCentral(opts);
}

// Insertar paquete SV en la tabla `central`.
// Se extraen voltaje, corriente, potencia desde `payload.values` (puede ser array o objeto)
// y se convierte `timestamp_ms` (ms) a TIMESTAMP.
async function insertSvPacket(payload) {
  try {
    if (!payload) {
      console.warn('insertSvPacket called with empty payload');
      return;
    }

    // timestamp en ms (fallback a Date.now())
    const tsMs = payload.timestamp_ms || payload.received_at || Date.now();

    let voltaje = null;
    let corriente = null;
    let potencia = null;

    // Prefer explicit top-level fields (voltaje/corriente/potencia) if present
    if (payload.voltaje !== undefined || payload.corriente !== undefined || payload.potencia !== undefined) {
      voltaje = payload.voltaje != null ? Number(payload.voltaje) : null;
      corriente = payload.corriente != null ? Number(payload.corriente) : null;
      potencia = payload.potencia != null ? Number(payload.potencia) : null;
    } else {
      const vals = payload.values;
      if (Array.isArray(vals)) {
        // order: [voltage, current, power]
        voltaje = vals[0] != null ? Number(vals[0]) : null;
        corriente = vals[1] != null ? Number(vals[1]) : null;
        potencia = vals[2] != null ? Number(vals[2]) : null;
      } else if (vals && typeof vals === 'object') {
        // support different naming variations
        voltaje = vals.voltage ?? vals.voltaje ?? vals.v ?? null;
        corriente = vals.current ?? vals.corriente ?? vals.i ?? null;
        potencia = vals.power ?? vals.potencia ?? vals.p ?? null;
        voltaje = voltaje != null ? Number(voltaje) : null;
        corriente = corriente != null ? Number(corriente) : null;
        potencia = potencia != null ? Number(potencia) : null;
      }
    }

    const ts = new Date(Number(tsMs));

    await pool.query(
      'INSERT INTO central(voltaje, corriente, potencia, timestamp) VALUES($1, $2, $3, $4)',
      [voltaje, corriente, potencia, ts]
    );
  } catch (err) {
    console.error('Error inserting into central:', err);
    throw err;
  }
}
 
export {
  pool,
  testConexion,
  getData,
  getDataFiltered,
  getAlertThreshold,
  upsertAlertThreshold,
  getCentral,
  getCentralFiltered,
  insertSvPacket
};


