import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import {
  ActionErrorMessage,
  ActionSuccessMessage,
  LoadErrorMessage,
  LoadingMessage,
} from '../components/PageMessages';
import './CrudPage.css';
import SiteFormDialog from './sites/SiteFormDialog';
import SitesTable from './sites/SitesTable';
import SiteToolbar from './sites/SiteToolbar';
import { useSitesPage } from './sites/useSitesPage';

export default function Sites() {
  const page = useSitesPage();
  const hasFilters =
    Boolean(page.debouncedSearch) || Boolean(page.siteStatusFilter);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Sites</h1>
        <p>List, search, filter, and manage sites</p>
      </header>

      <SiteToolbar
        siteSearchTerm={page.siteSearchTerm}
        onSearchChange={page.setSiteSearchTerm}
        siteStatusFilter={page.siteStatusFilter}
        onStatusFilterChange={page.setSiteStatusFilter}
        onAddSite={page.openCreate}
        onImportFile={page.handleImportFile}
        onExport={page.handleExport}
        importing={page.importing}
        exporting={page.exporting}
        exportDisabled={!page.loading && page.total === 0}
      />

      {page.loading && <LoadingMessage>Loading sites…</LoadingMessage>}

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

      {!page.loading && !page.loadError && (
        <>
          <SitesTable
            sites={page.sites}
            emptyMessage={
              page.total === 0 && hasFilters
                ? 'No sites match your search/filter.'
                : 'No sites yet. Add one to get started.'
            }
            onEdit={page.openEdit}
            onDelete={page.setSitePendingDelete}
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
        <SiteFormDialog
          editingSite={page.editingSite}
          siteForm={page.siteForm}
          onSiteFormChange={page.setSiteForm}
          formError={page.formError}
          saving={page.saving}
          onClose={page.closeForm}
          onSubmit={page.handleSubmit}
        />
      )}

      {page.sitePendingDelete && (
        <ConfirmDialog
          titleId="site-delete-title"
          title="Delete site?"
          description={`Delete “${page.sitePendingDelete.name}”? Linked installations will also be removed. This cannot be undone.`}
          busy={page.deleteBusy}
          onCancel={() => page.setSitePendingDelete(null)}
          onConfirm={page.confirmDelete}
        />
      )}
    </section>
  );
}
