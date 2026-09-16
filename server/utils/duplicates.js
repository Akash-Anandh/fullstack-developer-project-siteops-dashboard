import pool from '../db.js';

/** Case-insensitive, trim-aware site name lookup. */
export async function findSiteIdByNameCI(name, { excludeId } = {}) {
  const values = [name];
  let sql = `
    SELECT id FROM Sites
    WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1::text))`;
  if (excludeId != null) {
    values.push(excludeId);
    sql += ` AND id <> $${values.length}`;
  }
  sql += ` ORDER BY id ASC LIMIT 1`;
  const { rows } = await pool.query(sql, values);
  return rows[0]?.id ?? null;
}

/** Case-insensitive site + equipment duplicate lookup. */
export async function findInstallationIdBySiteEquipmentCI(
  siteId,
  equipmentType,
  { excludeId } = {}
) {
  const values = [siteId, equipmentType];
  let sql = `
    SELECT id FROM Installations
    WHERE site_id = $1
      AND LOWER(BTRIM(equipment_type)) = LOWER(BTRIM($2::text))`;
  if (excludeId != null) {
    values.push(excludeId);
    sql += ` AND id <> $${values.length}`;
  }
  sql += ` ORDER BY id ASC LIMIT 1`;
  const { rows } = await pool.query(sql, values);
  return rows[0]?.id ?? null;
}

export function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}
