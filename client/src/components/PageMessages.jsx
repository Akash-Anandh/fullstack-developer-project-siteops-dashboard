export function LoadingMessage({ children }) {
  return (
    <p className="state-msg" role="status">
      {children}
    </p>
  );
}

export function LoadErrorMessage({ message, onRetry }) {
  return (
    <div className="state-msg error" role="alert">
      <p>Could not load data.</p>
      <p className="error-detail">{message}</p>
      <button type="button" className="btn btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function ActionErrorMessage({ message, onDismiss }) {
  return (
    <div className="state-msg error" role="alert">
      <p>{message}</p>
      <button type="button" className="btn btn-ghost" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export function ActionSuccessMessage({ message, onDismiss }) {
  return (
    <div className="state-msg success" role="status">
      <p>{message}</p>
      <button type="button" className="btn btn-ghost" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
