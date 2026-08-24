const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'jalrakshak',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
  port: process.env.DB_PORT || process.env.PGPORT || 5432,
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};