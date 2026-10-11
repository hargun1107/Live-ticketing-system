
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventApi, seatHoldApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/SeatMap';
import BookingSummary from '../components/BookingSummary';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [eventRes, seatsRes] = await Promise.all([
        eventApi.getById(id),
        eventApi.getSeats(id),
      ]);

      setEvent(eventRes.data.data);
      setSeats(seatsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this event.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh the map so other users' bookings and holds become visible.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await eventApi.getSeats(id);
        setSeats(res.data.data);
      } catch (_) {
        // Ignore background refresh failures.
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE') return;

    setSelectedSeatIds((prev) =>
      prev.includes(seat.seat_id)
        ? prev.filter((sid) => sid !== seat.seat_id)
        : [...prev, seat.seat_id]
    );
  };

  const selectedSeats = seats.filter((seat) =>
    selectedSeatIds.includes(seat.seat_id)
  );

  const handleProceed = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setError('Please select at least one available seat.');
      return;
    }

    setHolding(true);
    setError('');

    try {
      // Ask the backend to hold the seats before entering checkout.
      const response = await seatHoldApi.create({
        eventId: Number(id),
        seatIds: selectedSeatIds,
      });

      navigate('/booking', {
        state: {
          eventId: id,
          event,
          selectedSeats,
          hold: response.data.data,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not hold these seats. Please refresh the seat map and try again.'
      );

      // Refresh statuses after a conflict.
      try {
        const res = await eventApi.getSeats(id);
        setSeats(res.data.data);
      } catch (_) {
        // Keep the original error visible.
      }
    } finally {
      setHolding(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !event) {
    return <ErrorMessage message={error} onRetry={load} />;
  }
  if (!event) return null;

  const dateLabel = new Date(event.event_date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page-container">
      <div className="event-details-header">
        <span className="event-card-category">{event.category}</span>
        <h1>{event.title}</h1>

        <p className="event-details-meta">
          {dateLabel} · {event.start_time?.slice(0, 5)}
          {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
        </p>

        <p className="event-details-venue">
          📍 {event.venue_name}, {event.address}, {event.city}
        </p>

        {event.description && (
          <p className="event-details-description">{event.description}</p>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="event-details-layout">
        <div className="event-details-seatmap">
          <h3>Select Your Seats</h3>

          {seats.length === 0 ? (
            <p className="empty-state">
              No seats have been configured for this event yet.
            </p>
          ) : (
            <SeatMap
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={toggleSeat}
            />
          )}
        </div>

        <div className="event-details-sidebar">
          <BookingSummary
            selectedSeats={selectedSeats}
            onConfirm={handleProceed}
            disabled={holding || selectedSeats.length === 0}
            confirmLabel={
              holding
                ? 'Holding seats...'
                : user
                  ? 'Proceed to Booking'
                  : 'Log in to Book'
            }
          />
        </div>
      </div>
    </div>
  );
}
