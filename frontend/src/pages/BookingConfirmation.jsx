import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, event, selectedSeats } = location.state || {};

  if (!booking) return <Navigate to="/my-bookings" replace />;

  return (
    <div className="page-container confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-check">✓</div>
        <h1>Booking Confirmed!</h1>
        <p>Your tickets for <strong>{event?.title}</strong> are booked.</p>

        <div className="confirmation-details">
          <div><span>Booking ID</span><strong>{booking.bookingRef}</strong></div>
          <div><span>Seats</span><strong>{selectedSeats?.map((s) => `${s.seat_row}${s.seat_number}`).join(', ')}</strong></div>
          <div><span>Total Paid</span><strong>₹{Number(booking.totalAmount).toLocaleString('en-IN')}</strong></div>
        </div>

        <div className="confirmation-actions">
          <button className="btn btn-primary" onClick={() => navigate('/my-bookings')}>
            View My Bookings
          </button>
          <Link to="/events" className="btn btn-outline">Browse More Events</Link>
        </div>
      </div>
    </div>
  );
}
