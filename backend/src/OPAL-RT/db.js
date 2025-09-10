import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config({ path: "./src/OPAL-RT/.env" });

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const testConexionOpal = async () => {
  try {
    const client = await pool.connect();
    console.log('Conexión a la base de datos exitosa');
    client.release();
  } catch (error) {
    console.error('Error en la conexión a la base de datos:', error);
  }
};

export const getDataOpal = async () => {
  try {
    const result = await pool.query('SELECT * FROM mdc_meas');
    return result.rows;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

export default pool;
