import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import pool from './db.js';
import sitesRouter from './routes/sites.js';
import installationsRouter from './routes/installations.js';
import summaryRouter from './routes/summary.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({
      status: 'ok',
      database: process.env.DB_NAME,
      server_time: result.rows[0].server_time,
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/sites', sitesRouter);
app.use('/api/installations', installationsRouter);
app.use('/api/summary', summaryRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    const result = await pool.query(
      `SELECT current_database() AS database, current_user AS user, NOW() AS server_time`
    );
    console.log('Connected to PostgreSQL:', result.rows[0]);

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
}

start();
