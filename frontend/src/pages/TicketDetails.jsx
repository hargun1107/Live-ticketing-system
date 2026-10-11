import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingApi } from '../services/api';
import TicketCard from '../components/TicketCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function TicketDetails() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.getById(id);
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!booking) return null;

  return (
    <div className="page-container">
      <Link to="/my-bookings" className="link-btn">&larr; Back to My Bookings</Link>
      <h1>{booking.event_title}</h1>
      <p className="event-details-meta">
        {new Date(booking.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}{booking.start_time?.slice(0, 5)}
      </p>
      <p className="event-details-venue">📍 {booking.venue_name}, {booking.venue_city}</p>

      <div className="tickets-grid">
        {booking.seats.map((ticket) => (
          <TicketCard key={ticket.ticket_code} ticket={ticket} booking={booking} />
        ))}
      </div>

      <div className="payment-summary-box">
        <h4>Payment Summary</h4>
        <div><span>Booking Reference</span><strong>{booking.booking_ref}</strong></div>
        <div><span>Status</span><strong>{booking.status}</strong></div>
        <div><span>Total Paid</span><strong>₹{Number(booking.total_amount).toLocaleString('en-IN')}</strong></div>
        {booking.payment && (
          <div><span>Payment Method</span><strong>{booking.payment.method}</strong></div>
        )}
      </div>
    </div>
  );
}
