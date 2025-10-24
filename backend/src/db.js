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

export const testConexion = async () => {
  try {
    const client = await pool.connect();
    console.log('Conexión a la base de datos exitosa');
    client.release();
  } catch (error) {
    console.error('Error en la conexión a la base de datos:', error);
  }
};

export const getData = async () => {
  try {
    const result = await pool.query('SELECT * FROM clima');
    return result.rows;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

export const getDataFiltered = async ({ start, end, agg } = {}) => {
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

export default pool;
