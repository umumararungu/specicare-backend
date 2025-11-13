// config/database.js - WITH BETTER DEBUGGING
const { Sequelize } = require('sequelize');
const path = require('path');

// Load environment variables from .env in development only (production uses platform env vars)
const envPath = path.resolve(process.cwd(), '.env');
if (process.env.NODE_ENV !== 'production') {
  console.log('Loading .env from:', envPath);
  const result = require('dotenv').config({ path: envPath });
  if (result.error) {
    console.warn(' .env file not found or could not be loaded:', result.error.message || result.error);
    console.warn(' Proceeding using process.env (some vars may be unset)');
  } else {
    console.log(' .env file loaded successfully');
  }
} else {
  console.log('Running in production mode; skipping .env load (expecting platform-provided env vars)');
}

// Debug: Show what environment variables are loaded
console.log('\n Loaded Environment Variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

// Allow using a single DATABASE_URL in production (e.g. Railway). If provided, prefer it.
const usingDatabaseUrl = !!process.env.DATABASE_URL;

// Ensure dbConfig is always defined and exported (even when using DATABASE_URL)
let dbConfig;

// Helper: pick the first non-empty env var from a list
const pickEnv = (...names) => {
  for (const n of names) {
    const v = process.env[n];
    if (v !== undefined && v !== null && v.toString().trim() !== '') return v;
  }
  return undefined;
};

if (!usingDatabaseUrl) {
  // Resolve env vars with fallbacks common on Railway: PG* and POSTGRES_*
  const resolved = {
    DB_NAME: pickEnv('DB_NAME', 'PGDATABASE', 'POSTGRES_DB'),
    DB_USER: pickEnv('DB_USER', 'PGUSER', 'POSTGRES_USER'),
    DB_PASSWORD: pickEnv('DB_PASSWORD', 'PGPASSWORD', 'POSTGRES_PASSWORD'),
    DB_HOST: pickEnv('DB_HOST', 'PGHOST'),
    DB_PORT: pickEnv('DB_PORT', 'PGPORT')
  };

  const missingEnvVars = Object.entries(resolved).filter(([k, v]) => !v).map(([k]) => k);

  if (missingEnvVars.length > 0) {
    const msg = `Missing or empty environment variables: ${missingEnvVars.join(', ')}. Please set them or provide DATABASE_URL.`;
    if (process.env.NODE_ENV === 'production') {
      console.error(msg);
      // In production we don't want to crash the process here; throw so the caller can decide.
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }

  // Attach resolved values back to process.env for compatibility with other code that may read DB_* vars
  if (resolved.DB_NAME) process.env.DB_NAME = resolved.DB_NAME;
  if (resolved.DB_USER) process.env.DB_USER = resolved.DB_USER;
  if (resolved.DB_PASSWORD) process.env.DB_PASSWORD = resolved.DB_PASSWORD;
  if (resolved.DB_HOST) process.env.DB_HOST = resolved.DB_HOST;
  if (resolved.DB_PORT) process.env.DB_PORT = resolved.DB_PORT;
}

// Database configuration
let sequelize;
if (usingDatabaseUrl) {
  console.log('\n Using DATABASE_URL for connection (Railway or similar)');
  console.log(' DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'NOT SET');

  // When connecting via a URL (Railway), ensure SSL is enabled and allow self-signed certs
  // (many hosted Postgres providers require SSL but use certificates that are not verified).
  const dialectOptions = {
    ssl: {
      require: true,
      // For some platforms like Railway/Heroku, you must set rejectUnauthorized=false
      // so Node/pg accepts the platform's certificate.
      rejectUnauthorized: false
    }
  };

  dbConfig = {
    useDatabaseUrl: true,
    connectionString: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions
  };

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions
  });
} else {
  dbConfig = {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || null,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // Allow opt-in SSL in non-URL mode (set DB_SSL=true in env to force SSL)
    dialectOptions: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined
  };

  console.log('\n  Database Configuration:');
  console.log('Host:', dbConfig.host);
  console.log('Port:', dbConfig.port);
  console.log('Database:', dbConfig.database);
  console.log('Username:', dbConfig.username);

  // Create Sequelize instance
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      pool: dbConfig.pool,
      dialectOptions: dbConfig.dialectOptions
    }
  );
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Database connection established successfully');
    return true;
  } catch (error) {
    console.error(' Unable to connect to database:', error.message);
    console.log(' Troubleshooting tips:');
    console.log('   1. Check if PostgreSQL is running');
    console.log('   2. Verify database credentials');
    console.log('   3. Check if database "specicare" exists');
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  dbConfig,
  testConnection
};
