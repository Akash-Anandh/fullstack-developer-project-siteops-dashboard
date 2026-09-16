import { Link } from 'react-router-dom';

export default function SummaryCards({ summaryMetrics }) {
  const cards = [
    {
      label: 'Sites',
      value: summaryMetrics.total_sites,
      to: '/sites',
    },
    {
      label: 'Installations',
      value: summaryMetrics.total_installations,
      to: '/installations',
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map(({ label, value, to }) => (
        <article key={label} className="summary-card">
          <p className="card-label">{label}</p>
          <Link className="card-value card-value-link" to={to}>
            {value}
          </Link>
        </article>
      ))}
    </div>
  );
}
