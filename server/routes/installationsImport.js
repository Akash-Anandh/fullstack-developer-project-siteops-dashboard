import pool from '../db.js';
import {
  fetchInstallationById,
  siteExists,
} from '../db/installationsQueries.js';
import { emptyToNull } from '../utils/emptyToNull.js';
import {
  findInstallationIdBySiteEquipmentCI,
  findSiteIdByNameCI,
  normalizeKey,
} from '../utils/duplicates.js';
import { INSTALLATION_STATUSES } from '../validation/installations.js';

function cell(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function ensureSiteByName(siteName, seenSites) {
  const siteKey = normalizeKey(siteName);
  if (seenSites.has(siteKey)) {
    return { siteId: seenSites.get(siteKey), created: false };
  }

  const existingId = await findSiteIdByNameCI(siteName);
  if (existingId) {
    seenSites.set(siteKey, existingId);
    return { siteId: existingId, created: false };
  }

  const { rows } = await pool.query(
    `INSERT INTO Sites (name, location, status)
     VALUES ($1, NULL, 'active')
     RETURNING id`,
    [siteName]
  );
  seenSites.set(siteKey, rows[0].id);
  return { siteId: rows[0].id, created: true };
}

function normalizeInstallationRow(raw, index) {
  const siteName = cell(raw?.site ?? raw?.site_name);
  const equipmentType = cell(raw?.equipment_type ?? raw?.equipment);
  const status = cell(raw?.status)
    .toLowerCase()
    .replace(/\s+/g, '_');
  const notes = cell(raw?.notes);

  const missing = [];
  if (!siteName) missing.push('Site');
  if (!equipmentType) missing.push('Equipment');
  if (!status) missing.push('Status');
  if (missing.length > 0) {
    return {
      error: `Row ${index + 1}: missing mandatory field(s): ${missing.join(', ')} — skipped`,
    };
  }

  if (siteName.length > 150) {
    return {
      error: `Row ${index + 1}: site name must be at most 150 characters — skipped`,
    };
  }
  if (equipmentType.length > 100) {
    return {
      error: `Row ${index + 1}: equipment must be at most 100 characters — skipped`,
    };
  }
  if (!INSTALLATION_STATUSES.includes(status)) {
    return {
      error: `Row ${index + 1}: status must be one of: ${INSTALLATION_STATUSES.join(', ')} — skipped`,
    };
  }
  if (notes && notes.length > 2000) {
    return {
      error: `Row ${index + 1}: notes must be at most 2000 characters — skipped`,
    };
  }

  return {
    row: {
      siteName,
      equipment_type: equipmentType,
      status,
      notes: emptyToNull(notes),
    },
  };
}

function isBlankInstallationRow(raw) {
  return (
    !cell(raw?.site ?? raw?.site_name) &&
    !cell(raw?.equipment_type ?? raw?.equipment) &&
    !cell(raw?.status) &&
    !cell(raw?.notes)
  );
}

/**
 * Upsert installations by site name + equipment type (case-insensitive).
 * Rows missing mandatory Site/Equipment/Status are skipped (not inserted/updated).
 */
export async function importInstallations(rows) {
  const inserted = [];
  const updated = [];
  const sitesCreated = [];
  const errors = [];
  let skipped = 0;
  /** @type {Map<string, number>} lower(site) -> site id */
  const seenSites = new Map();
  /** @type {Map<string, number>} `${siteId}:${lower(equipment)}` -> installation id */
  const seenInstallations = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    if (isBlankInstallationRow(rows[index])) {
      skipped += 1;
      continue;
    }

    const normalized = normalizeInstallationRow(rows[index], index);
    if (normalized.error) {
      errors.push(normalized.error);
      skipped += 1;
      continue;
    }

    const { siteName, equipment_type, status, notes } = normalized.row;

    try {
      const { siteId, created } = await ensureSiteByName(siteName, seenSites);
      if (created) sitesCreated.push(siteName);

      if (!(await siteExists(siteId))) {
        errors.push(
          `Row ${index + 1}: failed to resolve site "${siteName}" — skipped`
        );
        skipped += 1;
        continue;
      }

      const installKey = `${siteId}:${normalizeKey(equipment_type)}`;
      let existingId = seenInstallations.get(installKey) ?? null;
      if (existingId == null) {
        existingId = await findInstallationIdBySiteEquipmentCI(
          siteId,
          equipment_type
        );
      }

      if (existingId) {
        await pool.query(
          `UPDATE Installations
           SET equipment_type = $1, status = $2, notes = $3
           WHERE id = $4`,
          [equipment_type, status, notes, existingId]
        );
        updated.push(await fetchInstallationById(existingId));
        seenInstallations.set(installKey, existingId);
      } else {
        const { rows: createdRows } = await pool.query(
          `INSERT INTO Installations (site_id, equipment_type, status, notes)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [siteId, equipment_type, status, notes]
        );
        inserted.push(await fetchInstallationById(createdRows[0].id));
        seenInstallations.set(installKey, createdRows[0].id);
      }
    } catch (err) {
      errors.push(`Row ${index + 1}: ${err.message} — skipped`);
      skipped += 1;
    }
  }

  return {
    inserted: inserted.length,
    updated: updated.length,
    sites_created: sitesCreated.length,
    skipped,
    failed: errors.length,
    errors,
    items: { inserted, updated },
  };
}
