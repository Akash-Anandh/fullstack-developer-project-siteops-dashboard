import axios from 'axios';
import { PAGE_SIZE } from './constants';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

export function apiErrorMessage(err, fallback = 'Request failed') {
  if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
    return null;
  }
  const apiError = err.response?.data?.error;
  if (typeof apiError === 'string') return apiError;
  if (apiError?.message) return apiError.message;
  return err.message || fallback;
}

function withListParams(params = {}) {
  const query = {};
  if (params.q) query.q = params.q;
  if (params.status) query.status = params.status;
  if (params.equipment) query.equipment = params.equipment;
  if (params.include_equipment_types) query.include_equipment_types = '1';
  if (params.all) {
    query.all = '1';
    return query;
  }
  // Always page-sized: first load skip=0; Next/Prev changes skip by PAGE_SIZE
  query.limit = PAGE_SIZE;
  query.skip = Math.max(0, params.skip ?? 0);
  return query;
}

export async function fetchSummary(config = {}) {
  const { data: summary } = await api.get('/api/summary', config);
  return summary;
}

export async function fetchSites(params = {}, config = {}) {
  const { data } = await api.get('/api/sites', {
    params: withListParams(params),
    ...config,
  });
  return data;
}

export async function fetchSiteOptions(config = {}) {
  const { data: sites } = await api.get('/api/sites', {
    params: { options: '1' },
    ...config,
  });
  return sites;
}

export async function createSite(siteFields) {
  const { data: site } = await api.post('/api/sites', siteFields);
  return site;
}

export async function updateSite(siteId, siteFields) {
  const { data: site } = await api.put(`/api/sites/${siteId}`, siteFields);
  return site;
}

export async function deleteSite(siteId) {
  const { data: result } = await api.delete(`/api/sites/${siteId}`);
  return result;
}

export async function importSites(rows) {
  const { data } = await api.post('/api/sites/import', { rows });
  return data;
}

export async function fetchInstallations(params = {}, config = {}) {
  const { data } = await api.get('/api/installations', {
    params: withListParams(params),
    ...config,
  });
  return data;
}

export async function createInstallation(installationFields) {
  const { data: installation } = await api.post(
    '/api/installations',
    installationFields
  );
  return installation;
}

export async function updateInstallation(installationId, installationFields) {
  const { data: installation } = await api.put(
    `/api/installations/${installationId}`,
    installationFields
  );
  return installation;
}

export async function deleteInstallation(installationId) {
  const { data: result } = await api.delete(`/api/installations/${installationId}`);
  return result;
}

export async function importInstallations(rows) {
  const { data } = await api.post('/api/installations/import', { rows });
  return data;
}

export default api;
