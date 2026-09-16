import pool from '../db.js';
import { emptyToNull } from '../utils/emptyToNull.js';
import {
  findSiteIdByNameCI,
  normalizeKey,
} from '../utils/duplicates.js';
import { SITE_STATUSES } from '../validation/sites.js';

function cell(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeSiteRow(raw, index) {
  const name = cell(raw?.name);
  const location = cell(raw?.location);
  const status = cell(raw?.status).toLowerCase();

  const missing = [];
  if (!name) missing.push('Name');
  if (!status) missing.push('Status');
  if (missing.length > 0) {
    return {
      error: `Row ${index + 1}: missing mandatory field(s): ${missing.join(', ')} — skipped`,
    };
  }

  if (name.length > 150) {
    return { error: `Row ${index + 1}: name must be at most 150 characters — skipped` };
  }
  if (location && location.length > 200) {
    return {
      error: `Row ${index + 1}: location must be at most 200 characters — skipped`,
    };
  }
  if (!SITE_STATUSES.includes(status)) {
    return {
      error: `Row ${index + 1}: status must be one of: ${SITE_STATUSES.join(', ')} — skipped`,
    };
  }

  return {
    row: {
      name,
      location: emptyToNull(location),
      status,
    },
  };
}

function isBlankSiteRow(raw) {
  return !cell(raw?.name) && !cell(raw?.location) && !cell(raw?.status);
}

/**
 * Upsert sites by name (case-insensitive).
 * Rows missing mandatory Name/Status are skipped (not inserted/updated).
 */
export async function importSites(rows) {
  const inserted = [];
  const updated = [];
  const errors = [];
  let skipped = 0;
  /** @type {Map<string, number>} lower(name) -> site id seen in this import */
  const seenByName = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    if (isBlankSiteRow(rows[index])) {
      skipped += 1;
      continue;
    }

    const normalized = normalizeSiteRow(rows[index], index);
    if (normalized.error) {
      errors.push(normalized.error);
      skipped += 1;
      continue;
    }

    const { name, location, status } = normalized.row;
    const nameKey = normalizeKey(name);

    try {
      let existingId = seenByName.get(nameKey) ?? null;
      if (existingId == null) {
        existingId = await findSiteIdByNameCI(name);
      }

      if (existingId) {
        const { rows: updatedRows } = await pool.query(
          `UPDATE Sites
           SET name = $1, location = $2, status = $3
           WHERE id = $4
           RETURNING id, name, location, status, created_at`,
          [name, location, status, existingId]
        );
        updated.push(updatedRows[0]);
        seenByName.set(nameKey, existingId);
      } else {
        const { rows: createdRows } = await pool.query(
          `INSERT INTO Sites (name, location, status)
           VALUES ($1, $2, $3)
           RETURNING id, name, location, status, created_at`,
          [name, location, status]
        );
        inserted.push(createdRows[0]);
        seenByName.set(nameKey, createdRows[0].id);
      }
    } catch (err) {
      errors.push(`Row ${index + 1}: ${err.message} — skipped`);
      skipped += 1;
    }
  }

  return {
    inserted: inserted.length,
    updated: updated.length,
    skipped,
    failed: errors.length,
    errors,
    items: { inserted, updated },
  };
}
