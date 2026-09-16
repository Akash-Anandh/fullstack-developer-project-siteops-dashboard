import { Router } from 'express';
import pool from '../db.js';
import {
  fetchInstallationById,
  SELECT_INSTALLATION_WITH_SITE,
  siteExists,
} from '../db/installationsQueries.js';
import { idParam, validateRequest } from '../middleware/validateRequest.js';
import { emptyToNull } from '../utils/emptyToNull.js';
import { findInstallationIdBySiteEquipmentCI } from '../utils/duplicates.js';
import { parsePagination } from '../utils/pagination.js';
import {
  createInstallationRules,
  updateInstallationRules,
} from '../validation/installations.js';
import { importInstallations } from './installationsImport.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { limit, skip, all } = parsePagination(req.query);
    const status =
      typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const equipment =
      typeof req.query.equipment === 'string'
        ? req.query.equipment.trim()
        : '';

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      whereClauses.push(`i.status = $${paramIndex++}`);
      values.push(status);
    }
    if (equipment) {
      whereClauses.push(`i.equipment_type = $${paramIndex++}`);
      values.push(equipment);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const includeEquipmentTypes = req.query.include_equipment_types === '1';

    const itemsSql = all
      ? `${SELECT_INSTALLATION_WITH_SITE}
         ${whereSql}
         ORDER BY i.id ASC`
      : `${SELECT_INSTALLATION_WITH_SITE}
         ${whereSql}
         ORDER BY i.id ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`;

    const queries = [
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM Installations i
         JOIN Sites s ON s.id = i.site_id
         ${whereSql}`,
        values
      ),
      pool.query(itemsSql, all ? values : [...values, limit, skip]),
    ];

    if (includeEquipmentTypes) {
      queries.push(
        pool.query(
          `SELECT DISTINCT equipment_type
           FROM Installations
           WHERE equipment_type IS NOT NULL AND equipment_type <> ''
           ORDER BY equipment_type ASC`
        )
      );
    }

    const [countResult, itemsResult, equipmentResult] = await Promise.all(queries);

    const payload = {
      items: itemsResult.rows,
      total: countResult.rows[0].total,
      limit: all ? itemsResult.rows.length : limit,
      skip: all ? 0 : skip,
    };

    if (equipmentResult) {
      payload.equipment_types = equipmentResult.rows.map(
        (row) => row.equipment_type
      );
    }

    res.json(payload);
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

    const result = await importInstallations(rows);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', idParam, validateRequest, async (req, res, next) => {
  try {
    const installation = await fetchInstallationById(req.params.id);
    if (!installation) {
      return res.status(404).json({
        error: { message: 'Installation not found', status: 404 },
      });
    }
    res.json(installation);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  createInstallationRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const siteId = req.body.site_id;
      const equipmentType = req.body.equipment_type;
      const status = req.body.status ?? 'pending';
      const notes = emptyToNull(req.body.notes ?? null);

      if (!(await siteExists(siteId))) {
        return res.status(400).json({
          error: { message: 'site_id does not exist', status: 400 },
        });
      }

      const duplicateId = await findInstallationIdBySiteEquipmentCI(
        siteId,
        equipmentType
      );
      if (duplicateId) {
        return res.status(409).json({
          error: {
            message:
              'An installation with this site and equipment already exists. It will not be saved.',
            status: 409,
          },
        });
      }

      const { rows: inserted } = await pool.query(
        `INSERT INTO Installations (site_id, equipment_type, status, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [siteId, equipmentType, status, notes]
      );

      res.status(201).json(await fetchInstallationById(inserted[0].id));
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  idParam,
  updateInstallationRules,
  validateRequest,
  async (req, res, next) => {
    try {
      if (
        req.body.site_id !== undefined &&
        !(await siteExists(req.body.site_id))
      ) {
        return res.status(400).json({
          error: { message: 'site_id does not exist', status: 400 },
        });
      }

      const existing = await fetchInstallationById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          error: { message: 'Installation not found', status: 404 },
        });
      }

      const nextSiteId =
        req.body.site_id !== undefined ? req.body.site_id : existing.site_id;
      const nextEquipment =
        req.body.equipment_type !== undefined
          ? req.body.equipment_type
          : existing.equipment_type;

      const duplicateId = await findInstallationIdBySiteEquipmentCI(
        nextSiteId,
        nextEquipment,
        { excludeId: req.params.id }
      );
      if (duplicateId) {
        return res.status(409).json({
          error: {
            message:
              'An installation with this site and equipment already exists. It will not be saved.',
            status: 409,
          },
        });
      }

      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const column of ['site_id', 'equipment_type', 'status', 'notes']) {
        if (req.body[column] !== undefined) {
          setClauses.push(`${column} = $${paramIndex++}`);
          values.push(
            column === 'notes' ? emptyToNull(req.body[column]) : req.body[column]
          );
        }
      }

      values.push(req.params.id);

      const { rows: updated } = await pool.query(
        `UPDATE Installations
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id`,
        values
      );

      if (updated.length === 0) {
        return res.status(404).json({
          error: { message: 'Installation not found', status: 404 },
        });
      }

      res.json(await fetchInstallationById(updated[0].id));
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id', idParam, validateRequest, async (req, res, next) => {
  try {
    const installation = await fetchInstallationById(req.params.id);
    if (!installation) {
      return res.status(404).json({
        error: { message: 'Installation not found', status: 404 },
      });
    }

    await pool.query(`DELETE FROM Installations WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Installation deleted', installation });
  } catch (err) {
    next(err);
  }
});

export default router;
