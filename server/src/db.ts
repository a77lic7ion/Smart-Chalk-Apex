import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'smart_chalk',
      user: process.env.DB_USER || 'smart_chalk_user',
      password: process.env.DB_PASSWORD || 'smart_chalk_password',
    };

const pool = new Pool(poolConfig);

export default pool;
