import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  apiErrorMessage,
  createSite,
  deleteSite,
  fetchSites,
  importSites,
  updateSite,
} from '../../api';
import {
  emptySiteForm,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  SITE_EXPORT_HEADERS,
  SITE_HEADER_LABELS,
  SITE_IMPORT_ALIASES,
  SITE_STATUSES,
} from '../../constants';
import {
  downloadXlsx,
  readSheetRows,
  requireAllHeadersMatched,
  rowsFromMappedSheet,
} from '../../utils/xlsxIo';

function formatImportSummary(result) {
  const parts = [
    `Imported: ${result.inserted} added`,
    `${result.updated} updated`,
  ];
  if (result.skipped) parts.push(`${result.skipped} skipped`);
  if (result.failed) parts.push(`${result.failed} failed`);
  let message = parts.join(', ');
  if (result.errors?.length) {
    message += `. ${result.errors.slice(0, 3).join('; ')}`;
    if (result.errors.length > 3) {
      message += ` (+${result.errors.length - 3} more)`;
    }
  }
  return message;
}

export function useSitesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || '';
  const initialStatus = SITE_STATUSES.includes(statusFromUrl)
    ? statusFromUrl
    : '';

  const [sites, setSites] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [siteStatusFilter, setSiteStatusFilter] = useState(initialStatus);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [siteForm, setSiteForm] = useState(emptySiteForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [sitePendingDelete, setSitePendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const nextStatus = SITE_STATUSES.includes(statusFromUrl)
      ? statusFromUrl
      : '';
    setSiteStatusFilter(nextStatus);
    setSkip(0);
  }, [statusFromUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = siteSearchTerm.trim();
      setDebouncedSearch((prev) => {
        if (prev !== nextSearch) {
          setSkip(0);
        }
        return nextSearch;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [siteSearchTerm]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setLoadError(null);
      setActionError(null);
      try {
        const result = await fetchSites(
          {
            q: debouncedSearch,
            status: siteStatusFilter,
            skip,
          },
          { signal: controller.signal }
        );
        setSites(result.items);
        setTotal(result.total);
        const maxSkip = Math.max(
          0,
          Math.floor((result.total - 1) / PAGE_SIZE) * PAGE_SIZE
        );
        if (skip > maxSkip) setSkip(maxSkip);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setLoadError(apiErrorMessage(err, 'Failed to load sites'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedSearch, siteStatusFilter, skip, refreshToken]);

  function handleStatusFilterChange(nextStatus) {
    setSiteStatusFilter(nextStatus);
    setSkip(0);
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus) nextParams.set('status', nextStatus);
    else nextParams.delete('status');
    setSearchParams(nextParams, { replace: true });
  }

  function goToPage(nextPage) {
    setSkip(Math.max(0, nextPage * PAGE_SIZE));
  }

  function matchesFilters(site) {
    const matchesSearch =
      !debouncedSearch ||
      site.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus =
      !siteStatusFilter || site.status === siteStatusFilter;
    return matchesSearch && matchesStatus;
  }

  function openCreate() {
    setEditingSite(null);
    setSiteForm(emptySiteForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(site) {
    setEditingSite(site);
    setSiteForm({
      name: site.name || '',
      location: site.location || '',
      status: site.status || 'active',
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingSite(null);
    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const siteFields = {
      name: siteForm.name.trim(),
      location: siteForm.location.trim() || null,
      status: siteForm.status,
    };

    try {
      if (editingSite) {
        const updatedSite = await updateSite(editingSite.id, siteFields);
        if (matchesFilters(updatedSite)) {
          setSites((currentSites) =>
            currentSites.map((site) =>
              site.id === updatedSite.id ? updatedSite : site
            )
          );
        } else {
          const remaining = sites.length - 1;
          setSites((currentSites) =>
            currentSites.filter((site) => site.id !== updatedSite.id)
          );
          setTotal((count) => Math.max(0, count - 1));
          if (remaining === 0 && skip > 0) {
            setSkip((current) => Math.max(0, current - PAGE_SIZE));
          }
        }
      } else {
        const createdSite = await createSite(siteFields);
        if (matchesFilters(createdSite)) {
          setTotal((count) => count + 1);
          if (skip === 0) {
            setSites((currentSites) =>
              [...currentSites, createdSite].slice(0, PAGE_SIZE)
            );
          }
        }
      }
      setFormOpen(false);
      setEditingSite(null);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save site'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!sitePendingDelete) return;
    setDeleteBusy(true);
    try {
      await deleteSite(sitePendingDelete.id);
      const remaining = sites.length - 1;
      setSites((currentSites) =>
        currentSites.filter((site) => site.id !== sitePendingDelete.id)
      );
      setTotal((count) => Math.max(0, count - 1));
      setSitePendingDelete(null);
      setActionError(null);
      if (remaining === 0 && skip > 0) {
        setSkip((current) => Math.max(0, current - PAGE_SIZE));
      }
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not delete site'));
      setSitePendingDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleImportFile(file) {
    setImporting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const sheetRows = await readSheetRows(file);
      if (sheetRows.length === 0) {
        throw new Error('File has no data rows');
      }
      const headers = Object.keys(sheetRows[0] ?? {});
      const mapping = requireAllHeadersMatched(
        headers,
        SITE_IMPORT_ALIASES,
        SITE_HEADER_LABELS
      );
      const rows = rowsFromMappedSheet(sheetRows, mapping);
      if (rows.length === 0) {
        throw new Error('File has no data rows');
      }
      const result = await importSites(rows);
      if (result.inserted === 0 && result.updated === 0) {
        throw new Error(
          result.errors?.length
            ? `No rows imported. ${result.errors.slice(0, 3).join('; ')}`
            : 'No rows imported — all rows were missing mandatory fields'
        );
      }
      setActionSuccess(formatImportSummary(result));
      setSkip(0);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      setActionError(apiErrorMessage(err, err.message || 'Import failed'));
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      const result = await fetchSites({
        q: debouncedSearch,
        status: siteStatusFilter,
        all: true,
      });
      const exportRows = result.items.map((site) => ({
        Name: site.name ?? '',
        Location: site.location ?? '',
        Status: site.status ?? '',
      }));
      downloadXlsx('sites.xlsx', 'Sites', exportRows, SITE_EXPORT_HEADERS);
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  return {
    sites,
    total,
    skip,
    goToPage,
    pageSize: PAGE_SIZE,
    loading,
    loadError,
    actionError,
    setActionError,
    actionSuccess,
    setActionSuccess,
    siteSearchTerm,
    setSiteSearchTerm,
    debouncedSearch,
    siteStatusFilter,
    setSiteStatusFilter: handleStatusFilterChange,
    formOpen,
    editingSite,
    siteForm,
    setSiteForm,
    formError,
    saving,
    sitePendingDelete,
    setSitePendingDelete,
    deleteBusy,
    importing,
    exporting,
    retryLoad: () => setRefreshToken((token) => token + 1),
    openCreate,
    openEdit,
    closeForm,
    handleSubmit,
    confirmDelete,
    handleImportFile,
    handleExport,
  };
}
