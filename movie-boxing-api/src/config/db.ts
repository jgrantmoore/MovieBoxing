import { Pool } from 'pg';
import dotenv from 'dotenv';
import pg from 'pg';

// 20 is the OID for BIGINT
// 1700 is the OID for NUMERIC/DECIMAL
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10));
pg.types.setTypeParser(1700, (val: string) => parseFloat(val));

dotenv.config();

// Railway provides DATABASE_URL automatically if you link the service
export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
    rejectUnauthorized: false // Required for Railway/Cloud connections
  }
});