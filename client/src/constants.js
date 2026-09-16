export const PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 500;

export const SITE_STATUSES = ['active', 'inactive', 'maintenance'];

export const emptySiteForm = { name: '', location: '', status: 'active' };

export const INSTALLATION_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

export const emptyInstallationForm = {
  site_id: '',
  equipment_type: '',
  status: 'pending',
  notes: '',
};

export const SITE_IMPORT_ALIASES = {
  name: ['Name'],
  location: ['Location'],
  status: ['Status'],
};

export const SITE_EXPORT_HEADERS = ['Name', 'Location', 'Status'];

export const INSTALLATION_IMPORT_ALIASES = {
  site: ['Site'],
  equipment_type: ['Equipment'],
  status: ['Status'],
  notes: ['Notes'],
};

export const INSTALLATION_EXPORT_HEADERS = [
  'Site',
  'Equipment',
  'Status',
  'Notes',
];

/** Display labels for import error messages (must match table headers). */
export const SITE_HEADER_LABELS = {
  name: 'Name',
  location: 'Location',
  status: 'Status',
};

export const INSTALLATION_HEADER_LABELS = {
  site: 'Site',
  equipment_type: 'Equipment',
  status: 'Status',
  notes: 'Notes',
};
