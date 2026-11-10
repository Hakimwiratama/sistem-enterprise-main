export default function AsyncView({ loading, error, onRetry, children, label = 'data' }) {
  if (loading) {
    return (
      <div className="async-state" role="status" aria-live="polite">
        <span className="loading-mark" aria-hidden="true">✳</span>
        <span>Memuat {label}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="inline-alert" role="alert">
        <div>
          <strong>{label} belum dapat dimuat.</strong>
          <span>{error.message}</span>
        </div>
        {onRetry && (
          <button type="button" className="button button-outline" onClick={onRetry}>
            Coba lagi
          </button>
        )}
      </div>
    )
  }

  return children
}
