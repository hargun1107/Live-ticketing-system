export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-box">
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
