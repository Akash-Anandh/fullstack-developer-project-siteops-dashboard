export default function ConfirmDialog({
  titleId,
  title,
  description,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  busy = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <p className="dialog-desc">{description}</p>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
