import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import {
  ActionErrorMessage,
  ActionSuccessMessage,
  LoadErrorMessage,
  LoadingMessage,
} from '../components/PageMessages';
import './CrudPage.css';
import InstallationFormDialog from './installations/InstallationFormDialog';
import InstallationToolbar from './installations/InstallationToolbar';
import InstallationsTable from './installations/InstallationsTable';
import { useInstallationsPage } from './installations/useInstallationsPage';

export default function Installations() {
  const page = useInstallationsPage();
  const hasFilters = Boolean(page.statusFilter) || Boolean(page.equipmentFilter);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Installations</h1>
        <p>List and manage installations linked to sites</p>
      </header>

      <InstallationToolbar
        statusFilter={page.statusFilter}
        onStatusFilterChange={page.setStatusFilter}
        equipmentFilter={page.equipmentFilter}
        onEquipmentFilterChange={page.setEquipmentFilter}
        equipmentOptions={page.equipmentOptions}
        onAddInstallation={page.openCreate}
        addDisabled={!page.loading && page.sites.length === 0}
        addDisabledTitle={
          page.sites.length === 0 ? 'Add a site first' : undefined
        }
        onImportFile={page.handleImportFile}
        onExport={page.handleExport}
        importing={page.importing}
        exporting={page.exporting}
        exportDisabled={!page.loading && page.total === 0}
      />

      {page.loading && <LoadingMessage>Loading installations…</LoadingMessage>}

      {!page.loading && page.loadError && (
        <LoadErrorMessage message={page.loadError} onRetry={page.retryLoad} />
      )}

      {!page.loading && !page.loadError && page.actionError && (
        <ActionErrorMessage
          message={page.actionError}
          onDismiss={() => page.setActionError(null)}
        />
      )}

      {!page.loading && !page.loadError && page.actionSuccess && (
        <ActionSuccessMessage
          message={page.actionSuccess}
          onDismiss={() => page.setActionSuccess(null)}
        />
      )}

      {!page.loading && !page.loadError && page.sites.length === 0 && (
        <p className="state-msg">
          No sites available. Create a site before adding installations.
        </p>
      )}

      {!page.loading && !page.loadError && (
        <>
          <InstallationsTable
            installations={page.installations}
            emptyMessage={
              page.total === 0 && hasFilters
                ? 'No installations match your filters.'
                : 'No installations yet.'
            }
            onEdit={page.openEdit}
            onDelete={page.setInstallationPendingDelete}
          />
          <Pagination
            skip={page.skip}
            limit={page.pageSize}
            total={page.total}
            onPageChange={page.goToPage}
            disabled={page.loading}
          />
        </>
      )}

      {page.formOpen && (
        <InstallationFormDialog
          editingInstallation={page.editingInstallation}
          installationForm={page.installationForm}
          onInstallationFormChange={page.setInstallationForm}
          sites={page.sites}
          formError={page.formError}
          saving={page.saving}
          onClose={page.closeForm}
          onSubmit={page.handleSubmit}
        />
      )}

      {page.installationPendingDelete && (
        <ConfirmDialog
          titleId="inst-delete-title"
          title="Delete installation?"
          description={`Delete “${page.installationPendingDelete.equipment_type}” at ${page.installationPendingDelete.site_name}? This cannot be undone.`}
          busy={page.deleteBusy}
          onCancel={() => page.setInstallationPendingDelete(null)}
          onConfirm={page.confirmDelete}
        />
      )}
    </section>
  );
}
