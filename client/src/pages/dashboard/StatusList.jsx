import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatStatusLabel } from '../../utils/formatStatusLabel';

const VISIBLE_ROWS = 10;

export default function StatusList({ title, countsByStatus, linkForStatus }) {
  const [expanded, setExpanded] = useState(false);
  const statusEntries = Object.entries(countsByStatus || {});
  const canExpand = statusEntries.length > VISIBLE_ROWS;
  const visibleEntries =
    expanded || !canExpand ? statusEntries : statusEntries.slice(0, VISIBLE_ROWS);

  if (statusEntries.length === 0) {
    return (
      <div className="panel">
        <h3>{title}</h3>
        <p className="empty">No data yet</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>{title}</h3>
      <ul className="status-list">
        {visibleEntries.map(([status, count]) => {
          const to = linkForStatus?.(status);
          return (
            <li key={status}>
              <span className="status-label">{formatStatusLabel(status)}</span>
              {to ? (
                <Link className="status-count status-count-link" to={to}>
                  {count}
                </Link>
              ) : (
                <span className="status-count">{count}</span>
              )}
            </li>
          );
        })}
      </ul>
      {canExpand && (
        <div className="panel-more">
          <button
            type="button"
            className="btn btn-ghost panel-more-btn"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      )}
    </div>
  );
}
