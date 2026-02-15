// import { DataSource, DataSourceOptions } from 'typeorm';
// import { config } from 'dotenv';
// import { join } from 'path';

// config();

// export const dataSourceOptions: DataSourceOptions = {
//   type: 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432', 10),
//   username: process.env.DB_USERNAME || 'postgres',
//   password: process.env.DB_PASSWORD || 'postgres',
//   database: process.env.DB_DATABASE || 'nexaflow',
//   entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
//   migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
//   migrationsTableName: 'migrations',
//   synchronize: false,
//   logging: process.env.NODE_ENV === 'development',
// };

// const dataSource = new DataSource(dataSourceOptions);
// export default dataSource;
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nexaflow',

  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',

  // 🔹 Synchronize (désactivé pour migrations)
  synchronize: false,

  // 🔹 Logging
  logging: isDevelopment,
  logger: 'advanced-console',

  // 🔹 Pool
  extra: {
    max: 10, // équivalent poolSize
    connectionTimeoutMillis: 10000,
  },

  // 🔹 SSL production
  ssl: isProduction ? { rejectUnauthorized: false } : false,

  // 🔹 Cache
  cache: {
    type: 'database',
    tableName: 'query_result_cache',
    duration: 60000,
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
