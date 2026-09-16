import { useEffect, useState } from 'react';
import { apiErrorMessage, fetchSummary } from '../api';
import {
  LoadErrorMessage,
  LoadingMessage,
} from '../components/PageMessages';
import EquipmentBreakdown from './dashboard/EquipmentBreakdown';
import StatusList from './dashboard/StatusList';
import SummaryCards from './dashboard/SummaryCards';
import './Dashboard.css';

export default function Dashboard() {
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await fetchSummary({ signal: controller.signal });
        setSummaryMetrics(summary);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setError(apiErrorMessage(err, 'Failed to load summary'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [refreshToken]);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of sites and installations</p>
      </header>

      {loading && <LoadingMessage>Loading summary…</LoadingMessage>}

      {!loading && error && (
        <LoadErrorMessage
          message={error}
          onRetry={() => setRefreshToken((token) => token + 1)}
        />
      )}

      {!loading && !error && summaryMetrics && (
        <>
          <SummaryCards summaryMetrics={summaryMetrics} />
          <div className="panels">
            <StatusList
              title="Sites by status"
              countsByStatus={summaryMetrics.sites_by_status}
              linkForStatus={(status) =>
                `/sites?status=${encodeURIComponent(status)}`
              }
            />
            <StatusList
              title="Installations by status"
              countsByStatus={summaryMetrics.installations_by_status}
              linkForStatus={(status) =>
                `/installations?status=${encodeURIComponent(status)}`
              }
            />
            <EquipmentBreakdown
              equipmentRows={summaryMetrics.installations_by_equipment || []}
            />
          </div>
        </>
      )}
    </section>
  );
}
