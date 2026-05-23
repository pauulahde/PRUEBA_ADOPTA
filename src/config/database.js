const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'adoptasoft_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,               // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente PostgreSQL:', err);
  process.exit(-1);
});

/**
 * Ejecuta una query con parámetros.
 * @param {string} text   - Sentencia SQL con placeholders $1, $2 …
 * @param {Array}  params - Valores para los placeholders
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente del pool para transacciones manuales.
 * Recuerda llamar client.release() al finalizar.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
