import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.getMine();
      setBookings(res.data.data);
    } catch (err) {
      setError('Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await bookingApi.cancel(cancelTarget.booking_id);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel this booking.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <h1>My Bookings</h1>
      {error && <ErrorMessage message={error} />}

      {bookings.length === 0 ? (
        <p className="empty-state">
          You haven't booked any tickets yet. <Link to="/events">Browse events</Link>
        </p>
      ) : (
        <div className="bookings-list">
          {bookings.map((b) => {
            const isPast = new Date(b.event_date) < new Date();
            const canCancel = b.status === 'CONFIRMED' && !isPast;
            return (
              <div key={b.booking_id} className="booking-row">
                <div className="booking-row-main">
                  <h4>{b.event_title}</h4>
                  <p>{b.venue_name}, {b.venue_city}</p>
                  <p className="event-details-meta">
                    {new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{b.start_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="booking-row-meta">
                  <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                  <strong>₹{Number(b.total_amount).toLocaleString('en-IN')}</strong>
                  <span className="booking-ref">{b.booking_ref}</span>
                </div>
                <div className="booking-row-actions">
                  <Link to={`/tickets/${b.booking_id}`} className="btn btn-outline btn-sm">View Tickets</Link>
                  {canCancel && (
                    <button className="btn btn-danger btn-sm" onClick={() => setCancelTarget(b)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!cancelTarget}
        title="Cancel Booking"
        onClose={() => setCancelTarget(null)}
        footer={(
          <>
            <button className="btn btn-outline" onClick={() => setCancelTarget(null)}>Keep Booking</button>
            <button className="btn btn-danger" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
          </>
        )}
      >
        <p>Are you sure you want to cancel your booking for <strong>{cancelTarget?.event_title}</strong>? This will release your seats and cannot be undone.</p>
      </Modal>
    </div>
  );
}
