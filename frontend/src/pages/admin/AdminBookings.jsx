import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const STATUSES = ['', 'CONFIRMED', 'CANCELLED', 'PENDING', 'FAILED'];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getBookings(status ? { status } : {});
      setBookings(res.data.data);
    } catch (err) {
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>All Bookings</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      <table className="data-table">
        <thead>
          <tr><th>Ref</th><th>User</th><th>Event</th><th>Date</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.booking_id}>
              <td>{b.booking_ref}</td>
              <td>{b.user_name}<br /><small>{b.user_email}</small></td>
              <td>{b.event_title}</td>
              <td>{new Date(b.event_date).toLocaleDateString('en-IN')}</td>
              <td>₹{Number(b.total_amount).toLocaleString('en-IN')}</td>
              <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
