import { useState } from 'react';
import { Link } from 'react-router-dom';

const VISIBLE_ROWS = 10;

export default function EquipmentBreakdown({ equipmentRows }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = equipmentRows.length > VISIBLE_ROWS;
  const visibleRows =
    expanded || !canExpand ? equipmentRows : equipmentRows.slice(0, VISIBLE_ROWS);

  return (
    <div className="panel">
      <h3>Installations by equipment</h3>
      {equipmentRows.length === 0 ? (
        <p className="empty">No data yet</p>
      ) : (
        <>
          <ul className="status-list">
            {visibleRows.map((equipmentRow) => (
              <li key={equipmentRow.equipment_type}>
                <span className="status-label">{equipmentRow.equipment_type}</span>
                <Link
                  className="status-count status-count-link"
                  to={`/installations?equipment=${encodeURIComponent(equipmentRow.equipment_type)}`}
                >
                  {equipmentRow.count}
                </Link>
              </li>
            ))}
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
        </>
      )}
    </div>
  );
}
