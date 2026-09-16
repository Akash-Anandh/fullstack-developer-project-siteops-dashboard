import * as XLSX from 'xlsx';

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * Map spreadsheet headers to canonical field keys via aliases.
 * @param {string[]} headers
 * @param {Record<string, string[]>} fieldAliases canonicalKey -> aliases
 * @returns {{ mapping: Record<string, string>, missing: string[], unmatched: string[] }}
 */
export function mapHeaders(headers, fieldAliases) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    key: normalizeHeader(header),
  }));

  const mapping = {};
  const missing = [];
  const matchedOriginals = new Set();

  for (const [field, aliases] of Object.entries(fieldAliases)) {
    const aliasKeys = aliases.map(normalizeHeader);
    const match = normalizedHeaders.find((header) =>
      aliasKeys.includes(header.key)
    );
    if (match) {
      mapping[field] = match.original;
      matchedOriginals.add(match.original);
    } else {
      missing.push(field);
    }
  }

  const unmatched = headers.filter((header) => !matchedOriginals.has(header));

  return { mapping, missing, unmatched };
}

/**
 * Require every expected header to match. Abort import if any are missing
 * or if the file contains headers that are not part of the expected set.
 */
export function requireAllHeadersMatched(
  headers,
  fieldAliases,
  headerLabels
) {
  const expectedLabels = Object.keys(fieldAliases).map(
    (field) => headerLabels[field] || field
  );
  const { mapping, missing, unmatched } = mapHeaders(headers, fieldAliases);

  if (missing.length > 0 || unmatched.length > 0) {
    const parts = [];
    if (missing.length > 0) {
      const labels = missing.map((field) => headerLabels[field] || field);
      parts.push(`missing: ${labels.join(', ')}`);
    }
    if (unmatched.length > 0) {
      parts.push(`unexpected: ${unmatched.join(', ')}`);
    }
    throw new Error(
      `Import aborted — headers must exactly match [${expectedLabels.join(', ')}]. ${parts.join('; ')}.`
    );
  }

  return mapping;
}

export function readSheetRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('Workbook has no sheets'));
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function rowsFromMappedSheet(sheetRows, mapping) {
  return sheetRows.map((sheetRow) => {
    const row = {};
    for (const [field, header] of Object.entries(mapping)) {
      const value = sheetRow[header];
      row[field] =
        value === undefined || value === null ? '' : String(value).trim();
    }
    return row;
  });
}

export function downloadXlsx(filename, sheetName, rows, headers) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
