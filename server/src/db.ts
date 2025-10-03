import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'smart_chalk',
  user: 'smart_chalk_user',
  password: 'smart_chalk_password',
});

export default pool;
