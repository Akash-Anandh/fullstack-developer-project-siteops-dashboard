import { Router } from 'express';
import pool from '../db.js';

const router = Router();

function statusCountsToMap(rows) {
  return rows.reduce((countsByStatus, row) => {
    countsByStatus[row.status] = Number(row.count);
    return countsByStatus;
  }, {});
}

router.get('/', async (_req, res, next) => {
  try {
    const [totalsResult, sitesByStatusResult, installationsByStatusResult, byEquipmentResult] =
      await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM Sites) AS total_sites,
            (SELECT COUNT(*)::int FROM Installations) AS total_installations
        `),
        pool.query(`
          SELECT status, COUNT(*)::int AS count
          FROM Sites
          GROUP BY status
          ORDER BY status
        `),
        pool.query(`
          SELECT status, COUNT(*)::int AS count
          FROM Installations
          GROUP BY status
          ORDER BY status
        `),
        pool.query(`
          SELECT equipment_type, COUNT(*)::int AS count
          FROM Installations
          GROUP BY equipment_type
          ORDER BY count DESC, equipment_type
        `),
      ]);

    const totals = totalsResult.rows[0];

    res.json({
      total_sites: totals.total_sites,
      total_installations: totals.total_installations,
      sites_by_status: statusCountsToMap(sitesByStatusResult.rows),
      installations_by_status: statusCountsToMap(installationsByStatusResult.rows),
      installations_by_equipment: byEquipmentResult.rows.map((row) => ({
        equipment_type: row.equipment_type,
        count: Number(row.count),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
