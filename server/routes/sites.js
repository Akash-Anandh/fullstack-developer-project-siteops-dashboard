import { Router } from 'express';
import pool from '../db.js';
import { idParam, validateRequest } from '../middleware/validateRequest.js';
import { emptyToNull } from '../utils/emptyToNull.js';
import { findSiteIdByNameCI } from '../utils/duplicates.js';
import { parsePagination } from '../utils/pagination.js';
import { createSiteRules, updateSiteRules } from '../validation/sites.js';
import { importSites } from './sitesImport.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    if (req.query.options === '1') {
      const { rows } = await pool.query(
        `SELECT id, name FROM Sites ORDER BY name ASC`
      );
      return res.json(rows);
    }

    const { limit, skip, all } = parsePagination(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status =
      typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (q) {
      whereClauses.push(`name ILIKE $${paramIndex++}`);
      values.push(`%${q}%`);
    }
    if (status) {
      whereClauses.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const itemsSql = all
      ? `SELECT id, name, location, status, created_at
         FROM Sites
         ${whereSql}
         ORDER BY id ASC`
      : `SELECT id, name, location, status, created_at
         FROM Sites
         ${whereSql}
         ORDER BY id ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`;

    const [countResult, itemsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM Sites ${whereSql}`,
        values
      ),
      pool.query(itemsSql, all ? values : [...values, limit, skip]),
    ]);

    res.json({
      items: itemsResult.rows,
      total: countResult.rows[0].total,
      limit: all ? itemsResult.rows.length : limit,
      skip: all ? 0 : skip,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows) {
      return res.status(400).json({
        error: { message: 'rows must be an array', status: 400 },
      });
    }
    if (rows.length === 0) {
      return res.status(400).json({
        error: { message: 'rows cannot be empty', status: 400 },
      });
    }
    if (rows.length > 5000) {
      return res.status(400).json({
        error: { message: 'rows cannot exceed 5000', status: 400 },
      });
    }

    const result = await importSites(rows);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', idParam, validateRequest, async (req, res, next) => {
  try {
    const { rows: sites } = await pool.query(
      `SELECT id, name, location, status, created_at
       FROM Sites
       WHERE id = $1`,
      [req.params.id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        error: { message: 'Site not found', status: 404 },
      });
    }

    res.json(sites[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', createSiteRules, validateRequest, async (req, res, next) => {
  try {
    const name = req.body.name;
    const location = emptyToNull(req.body.location ?? null);
    const status = req.body.status ?? 'active';

    const duplicateId = await findSiteIdByNameCI(name);
    if (duplicateId) {
      return res.status(409).json({
        error: {
          message:
            'A site with this name already exists. Change the name to save.',
          status: 409,
        },
      });
    }

    const { rows: createdSites } = await pool.query(
      `INSERT INTO Sites (name, location, status)
       VALUES ($1, $2, $3)
       RETURNING id, name, location, status, created_at`,
      [name, location, status]
    );

    res.status(201).json(createdSites[0]);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  idParam,
  updateSiteRules,
  validateRequest,
  async (req, res, next) => {
    try {
      if (req.body.name !== undefined) {
        const duplicateId = await findSiteIdByNameCI(req.body.name, {
          excludeId: req.params.id,
        });
        if (duplicateId) {
          return res.status(409).json({
            error: {
              message:
                'A site with this name already exists. Change the name to save.',
              status: 409,
            },
          });
        }
      }

      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const column of ['name', 'location', 'status']) {
        if (req.body[column] !== undefined) {
          setClauses.push(`${column} = $${paramIndex++}`);
          values.push(
            column === 'location'
              ? emptyToNull(req.body[column])
              : req.body[column]
          );
        }
      }

      values.push(req.params.id);

      const { rows: updatedSites } = await pool.query(
        `UPDATE Sites
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, name, location, status, created_at`,
        values
      );

      if (updatedSites.length === 0) {
        return res.status(404).json({
          error: { message: 'Site not found', status: 404 },
        });
      }

      res.json(updatedSites[0]);
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id', idParam, validateRequest, async (req, res, next) => {
  try {
    const { rows: deletedSites } = await pool.query(
      `DELETE FROM Sites
       WHERE id = $1
       RETURNING id, name, location, status, created_at`,
      [req.params.id]
    );

    if (deletedSites.length === 0) {
      return res.status(404).json({
        error: { message: 'Site not found', status: 404 },
      });
    }

    res.json({ message: 'Site deleted', site: deletedSites[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
