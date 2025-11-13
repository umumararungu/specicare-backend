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

if (!usingDatabaseUrl) {
  // Validate required environment variables when DATABASE_URL is not present
  const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_HOST'];
  const missingEnvVars = requiredEnvVars.filter(envVar => {
    const value = process.env[envVar];
    return !value || value.toString().trim() === '';
  });

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
}

// Database configuration
let sequelize;
if (usingDatabaseUrl) {
  console.log('\n Using DATABASE_URL for connection');
  console.log(' DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'NOT SET');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production'
    }
  });
} else {
  const dbConfig = {
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
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production'
    }
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
