import ImportExportButtons from '../../components/ImportExportButtons';
import { SITE_STATUSES } from '../../constants';

export default function SiteToolbar({
  siteSearchTerm,
  onSearchChange,
  siteStatusFilter,
  onStatusFilterChange,
  onAddSite,
  onImportFile,
  onExport,
  importing,
  exporting,
  exportDisabled,
}) {
  return (
    <div className="toolbar">
      <input
        className="field toolbar-grow"
        type="search"
        placeholder="Search by name…"
        value={siteSearchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search sites by name"
      />
      <select
        className="select filter-status"
        value={siteStatusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {SITE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <ImportExportButtons
        onImportFile={onImportFile}
        onExport={onExport}
        importing={importing}
        exporting={exporting}
        exportDisabled={exportDisabled}
      />
      <button type="button" className="btn btn-primary" onClick={onAddSite}>
        Add site
      </button>
    </div>
  );
}
