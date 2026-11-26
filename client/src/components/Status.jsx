export function Loading({ label = 'Loading' }) {
  return <p className="muted loading" role="status">{label}</p>;
}

export function ErrorNotice({ message, onRetry }) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" className="link-button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

// Hidden from people (and screen readers); bots that fill every field get
// caught by the server. See isSpam() in server/src/middleware.js.
export function Honeypot() {
  return (
    <div className="honeypot" aria-hidden="true">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
