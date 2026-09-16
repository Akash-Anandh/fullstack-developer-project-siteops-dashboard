import fs from 'fs';
import pg from 'pg';

const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  await client.query(sql);
  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`
  );
  console.log('TABLES:', tables.rows.map((r) => r.tablename).join(','));
} finally {
  client.release();
  await pool.end();
}
