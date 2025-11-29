const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Pool configuration with support for both local PostgreSQL and Supabase
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || 5432, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// Add SSL configuration for Supabase (required for cloud connections)
if (process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Required for Supabase
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Log connection details on startup (for debugging)
pool.on('connect', () => {
  console.log('✅ Successfully connected to PostgreSQL database at:', process.env.DB_HOST);
});

module.exports = pool;
