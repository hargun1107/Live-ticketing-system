import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-container not-found">
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
