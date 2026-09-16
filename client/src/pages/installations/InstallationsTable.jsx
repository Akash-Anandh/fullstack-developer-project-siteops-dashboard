import RowActionsMenu from '../../components/RowActionsMenu';
import { formatStatusLabel } from '../../utils/formatStatusLabel';

export default function InstallationsTable({
  installations,
  emptyMessage = 'No installations yet.',
  onEdit,
  onDelete,
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Site</th>
            <th>Equipment</th>
            <th>Status</th>
            <th>Notes</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {installations.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-row">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            installations.map((installation) => (
              <tr key={installation.id}>
                <td>{installation.site_name}</td>
                <td>{installation.equipment_type}</td>
                <td>
                  <span className={`badge badge-${installation.status}`}>
                    {formatStatusLabel(installation.status)}
                  </span>
                </td>
                <td className={!installation.notes ? 'muted' : undefined}>
                  {installation.notes || '—'}
                </td>
                <td className="col-actions">
                  <RowActionsMenu
                    label={`Actions for ${installation.equipment_type} at ${installation.site_name}`}
                    onEdit={() => onEdit(installation)}
                    onDelete={() => onDelete(installation)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
