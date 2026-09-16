import ImportExportButtons from '../../components/ImportExportButtons';
import { INSTALLATION_STATUSES } from '../../constants';
import { formatStatusLabel } from '../../utils/formatStatusLabel';

export default function InstallationToolbar({
  statusFilter,
  onStatusFilterChange,
  equipmentFilter,
  onEquipmentFilterChange,
  equipmentOptions,
  onAddInstallation,
  addDisabled,
  addDisabledTitle,
  onImportFile,
  onExport,
  importing,
  exporting,
  exportDisabled,
}) {
  return (
    <div className="toolbar">
      <select
        className="select filter-status"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {INSTALLATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {formatStatusLabel(status)}
          </option>
        ))}
      </select>
      <select
        className="select filter-status"
        value={equipmentFilter}
        onChange={(event) => onEquipmentFilterChange(event.target.value)}
        aria-label="Filter by equipment"
      >
        <option value="">All equipment</option>
        {equipmentOptions.map((equipmentType) => (
          <option key={equipmentType} value={equipmentType}>
            {equipmentType}
          </option>
        ))}
      </select>
      <div className="toolbar-spacer" />
      <ImportExportButtons
        onImportFile={onImportFile}
        onExport={onExport}
        importing={importing}
        exporting={exporting}
        exportDisabled={exportDisabled}
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={onAddInstallation}
        disabled={addDisabled}
        title={addDisabledTitle}
      >
        Add installation
      </button>
    </div>
  );
}
