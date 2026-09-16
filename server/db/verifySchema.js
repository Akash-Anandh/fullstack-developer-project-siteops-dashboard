import 'dotenv/config';
import pool from '../db.js';

const cols = await pool.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'installations'
  ORDER BY ordinal_position
`);
const users = await pool.query(`SELECT to_regclass('public.users') AS users`);
console.log('installations columns:', cols.rows.map((r) => r.column_name).join(', '));
console.log('users table:', users.rows[0].users);
await pool.end();
