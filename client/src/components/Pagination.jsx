export default function Pagination({
  skip,
  limit,
  total,
  onPageChange,
  disabled = false,
}) {
  if (total <= 0) return null;

  const page = Math.floor(skip / limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = skip + 1;
  const to = Math.min(skip + limit, total);

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled || page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <p className="pagination-meta">
        {from}–{to} of {total}
        <span className="pagination-page">
          {' '}
          · Page {page + 1} of {totalPages}
        </span>
      </p>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled || page + 1 >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
