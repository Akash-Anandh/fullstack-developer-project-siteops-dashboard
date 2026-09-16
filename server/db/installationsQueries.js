import pool from '../db.js';

export const SELECT_INSTALLATION_WITH_SITE = `
  SELECT
    i.id,
    i.site_id,
    i.equipment_type,
    i.status,
    i.notes,
    s.name AS site_name,
    s.location AS site_location,
    s.status AS site_status
  FROM Installations i
  JOIN Sites s ON s.id = i.site_id
`;

export async function siteExists(siteId) {
  const { rows } = await pool.query(`SELECT id FROM Sites WHERE id = $1`, [
    siteId,
  ]);
  return rows.length > 0;
}

export async function fetchInstallationById(installationId) {
  const { rows } = await pool.query(
    `${SELECT_INSTALLATION_WITH_SITE} WHERE i.id = $1`,
    [installationId]
  );
  return rows[0] ?? null;
}
