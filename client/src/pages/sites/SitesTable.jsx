import RowActionsMenu from '../../components/RowActionsMenu';

export default function SitesTable({
  sites,
  emptyMessage = 'No sites yet.',
  onEdit,
  onDelete,
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Status</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sites.length === 0 ? (
            <tr>
              <td colSpan={4} className="empty-row">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sites.map((site) => (
              <tr key={site.id}>
                <td>{site.name}</td>
                <td className={!site.location ? 'muted' : undefined}>
                  {site.location || '—'}
                </td>
                <td>
                  <span className={`badge badge-${site.status}`}>
                    {site.status}
                  </span>
                </td>
                <td className="col-actions">
                  <RowActionsMenu
                    label={`Actions for ${site.name}`}
                    onEdit={() => onEdit(site)}
                    onDelete={() => onDelete(site)}
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
