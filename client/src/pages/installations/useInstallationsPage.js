import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  apiErrorMessage,
  createInstallation,
  deleteInstallation,
  fetchInstallations,
  fetchSiteOptions,
  importInstallations,
  updateInstallation,
} from '../../api';
import {
  emptyInstallationForm,
  INSTALLATION_EXPORT_HEADERS,
  INSTALLATION_HEADER_LABELS,
  INSTALLATION_IMPORT_ALIASES,
  INSTALLATION_STATUSES,
  PAGE_SIZE,
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
  if (result.sites_created) {
    parts.push(`${result.sites_created} sites created`);
  }
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

export function useInstallationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || '';
  const equipmentFromUrl = searchParams.get('equipment') || '';
  const initialStatus = INSTALLATION_STATUSES.includes(statusFromUrl)
    ? statusFromUrl
    : '';

  const [installations, setInstallations] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [sites, setSites] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const equipmentOptionsLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [equipmentFilter, setEquipmentFilter] = useState(equipmentFromUrl);

  const [formOpen, setFormOpen] = useState(false);
  const [editingInstallation, setEditingInstallation] = useState(null);
  const [installationForm, setInstallationForm] = useState(emptyInstallationForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [installationPendingDelete, setInstallationPendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const nextStatus = INSTALLATION_STATUSES.includes(statusFromUrl)
      ? statusFromUrl
      : '';
    setStatusFilter(nextStatus);
    setEquipmentFilter(equipmentFromUrl);
    setSkip(0);
  }, [statusFromUrl, equipmentFromUrl]);

  // Site dropdown options: once on mount + manual retry only (not after CRUD)
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const siteOptions = await fetchSiteOptions({
          signal: controller.signal,
        });
        setSites(siteOptions);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setSites([]);
      }
    })();

    return () => controller.abort();
  }, [refreshToken]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setLoadError(null);
      setActionError(null);
      try {
        const includeEquipmentTypes = !equipmentOptionsLoadedRef.current;
        const installationResult = await fetchInstallations(
          {
            status: statusFilter,
            equipment: equipmentFilter,
            skip,
            include_equipment_types: includeEquipmentTypes,
          },
          { signal: controller.signal }
        );
        setInstallations(installationResult.items);
        setTotal(installationResult.total);
        if (installationResult.equipment_types) {
          const types = new Set(installationResult.equipment_types);
          if (equipmentFilter) types.add(equipmentFilter);
          setEquipmentOptions(
            [...types].sort((a, b) => a.localeCompare(b))
          );
          equipmentOptionsLoadedRef.current = true;
        } else if (equipmentFilter) {
          setEquipmentOptions((current) =>
            current.includes(equipmentFilter)
              ? current
              : [...current, equipmentFilter].sort((a, b) =>
                  a.localeCompare(b)
                )
          );
        }
        const maxSkip = Math.max(
          0,
          Math.floor((installationResult.total - 1) / PAGE_SIZE) * PAGE_SIZE
        );
        if (skip > maxSkip) setSkip(maxSkip);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setLoadError(apiErrorMessage(err, 'Failed to load installations'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [statusFilter, equipmentFilter, skip, refreshToken]);

  function syncFilters({ nextStatus = statusFilter, nextEquipment = equipmentFilter }) {
    const nextParams = new URLSearchParams();
    if (nextStatus) nextParams.set('status', nextStatus);
    if (nextEquipment) nextParams.set('equipment', nextEquipment);
    setSearchParams(nextParams, { replace: true });
  }

  function handleStatusFilterChange(nextStatus) {
    setStatusFilter(nextStatus);
    setSkip(0);
    syncFilters({ nextStatus });
  }

  function handleEquipmentFilterChange(nextEquipment) {
    setEquipmentFilter(nextEquipment);
    setSkip(0);
    syncFilters({ nextEquipment });
  }

  function goToPage(nextPage) {
    setSkip(Math.max(0, nextPage * PAGE_SIZE));
  }

  function matchesFilters(row) {
    return (
      (!statusFilter || row.status === statusFilter) &&
      (!equipmentFilter || row.equipment_type === equipmentFilter)
    );
  }

  function rememberEquipmentType(equipmentType) {
    if (!equipmentType) return;
    setEquipmentOptions((current) =>
      current.includes(equipmentType)
        ? current
        : [...current, equipmentType].sort((a, b) => a.localeCompare(b))
    );
  }

  function openCreate() {
    setEditingInstallation(null);
    setInstallationForm({
      ...emptyInstallationForm,
      site_id: sites[0]?.id ? String(sites[0].id) : '',
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(installation) {
    setEditingInstallation(installation);
    setInstallationForm({
      site_id: String(installation.site_id),
      equipment_type: installation.equipment_type || '',
      status: installation.status || 'pending',
      notes: installation.notes || '',
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingInstallation(null);
    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!installationForm.site_id) {
      setFormError('Select a site');
      return;
    }

    setSaving(true);
    setFormError(null);
    const fields = {
      site_id: Number(installationForm.site_id),
      equipment_type: installationForm.equipment_type.trim(),
      status: installationForm.status,
      notes: installationForm.notes.trim() || null,
    };

    try {
      if (editingInstallation) {
        const updated = await updateInstallation(editingInstallation.id, fields);
        rememberEquipmentType(updated.equipment_type);

        if (matchesFilters(updated)) {
          setInstallations((list) =>
            list.map((row) => (row.id === updated.id ? updated : row))
          );
        } else {
          const remaining = installations.length - 1;
          setInstallations((list) =>
            list.filter((row) => row.id !== updated.id)
          );
          setTotal((count) => Math.max(0, count - 1));
          if (remaining === 0 && skip > 0) {
            setSkip((current) => Math.max(0, current - PAGE_SIZE));
          }
        }
      } else {
        const created = await createInstallation(fields);
        rememberEquipmentType(created.equipment_type);

        if (matchesFilters(created)) {
          setTotal((count) => count + 1);
          if (skip === 0) {
            setInstallations((list) =>
              [created, ...list].slice(0, PAGE_SIZE)
            );
          }
        }
      }

      setFormOpen(false);
      setEditingInstallation(null);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save installation'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!installationPendingDelete) return;
    setDeleteBusy(true);
    try {
      await deleteInstallation(installationPendingDelete.id);
      const remaining = installations.length - 1;
      setInstallations((list) =>
        list.filter((row) => row.id !== installationPendingDelete.id)
      );
      setTotal((count) => Math.max(0, count - 1));
      setInstallationPendingDelete(null);
      setActionError(null);
      if (remaining === 0 && skip > 0) {
        setSkip((current) => Math.max(0, current - PAGE_SIZE));
      }
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not delete installation'));
      setInstallationPendingDelete(null);
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
        INSTALLATION_IMPORT_ALIASES,
        INSTALLATION_HEADER_LABELS
      );
      const rows = rowsFromMappedSheet(sheetRows, mapping);
      if (rows.length === 0) {
        throw new Error('File has no data rows');
      }
      const result = await importInstallations(rows);
      if (result.inserted === 0 && result.updated === 0) {
        throw new Error(
          result.errors?.length
            ? `No rows imported. ${result.errors.slice(0, 3).join('; ')}`
            : 'No rows imported — all rows were missing mandatory fields'
        );
      }
      setActionSuccess(formatImportSummary(result));
      equipmentOptionsLoadedRef.current = false;
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
      const result = await fetchInstallations({
        status: statusFilter,
        equipment: equipmentFilter,
        all: true,
      });
      const exportRows = result.items.map((row) => ({
        Site: row.site_name ?? '',
        Equipment: row.equipment_type ?? '',
        Status: row.status ?? '',
        Notes: row.notes ?? '',
      }));
      downloadXlsx(
        'installations.xlsx',
        'Installations',
        exportRows,
        INSTALLATION_EXPORT_HEADERS
      );
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  return {
    installations,
    total,
    skip,
    goToPage,
    pageSize: PAGE_SIZE,
    sites,
    loading,
    loadError,
    actionError,
    setActionError,
    actionSuccess,
    setActionSuccess,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    equipmentFilter,
    setEquipmentFilter: handleEquipmentFilterChange,
    equipmentOptions,
    formOpen,
    editingInstallation,
    installationForm,
    setInstallationForm,
    formError,
    saving,
    installationPendingDelete,
    setInstallationPendingDelete,
    deleteBusy,
    importing,
    exporting,
    retryLoad: () => {
      equipmentOptionsLoadedRef.current = false;
      setRefreshToken((token) => token + 1);
    },
    openCreate,
    openEdit,
    closeForm,
    handleSubmit,
    confirmDelete,
    handleImportFile,
    handleExport,
  };
}
