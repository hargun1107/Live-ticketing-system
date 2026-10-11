
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { bookingApi, seatHoldApi } from '../services/api';
import BookingSummary from '../components/BookingSummary';

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'NETBANKING', label: 'Net Banking' },
  { value: 'WALLET', label: 'Wallet' },
];

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();

  const { eventId, event, selectedSeats, hold } = location.state || {};

  const [method, setMethod] = useState('CARD');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!hold?.expiresAt) return 0;
    return Math.max(
      0,
      Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)
    );
  });

  const completedRef = useRef(false);
  const releasedRef = useRef(false);
  const releaseTimerRef = useRef(null);

  const seatIds = useMemo(
    () => (selectedSeats || []).map((seat) => seat.seat_id),
    [selectedSeats]
  );

  const releaseHold = useCallback(async () => {
    if (releasedRef.current || completedRef.current || seatIds.length === 0) {
      return;
    }

    releasedRef.current = true;

    try {
      await seatHoldApi.release(seatIds);
    } catch (_) {
      // The backend expiry check remains the fallback.
    }
  }, [seatIds]);

  // Keep the countdown synchronized with the server-provided expiry time.
  useEffect(() => {
    if (!hold?.expiresAt) return undefined;

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)
      );

      setRemainingSeconds(seconds);
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [hold?.expiresAt]);

  // Release the hold when checkout is abandoned.
  useEffect(() => {
    // React Strict Mode performs an immediate setup/cleanup/setup cycle in
    // development. Deferring release lets the second setup cancel that probe.
    if (releaseTimerRef.current !== null) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }

    return () => {
      if (!completedRef.current && !releasedRef.current) {
        releaseTimerRef.current = setTimeout(() => {
          releaseTimerRef.current = null;
          void releaseHold();
        }, 0);
      }
    };
  }, [releaseHold]);

  if (!eventId || !selectedSeats || selectedSeats.length === 0 || !hold?.expiresAt) {
    return <Navigate to="/events" replace />;
  }

  const handlePay = async () => {
    if (remainingSeconds <= 0) {
      setError('Your seat hold has expired. Please select your seats again.');
      await releaseHold();
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Simulate a brief payment-processing delay.
      await new Promise((resolve) => setTimeout(resolve, 900));

      const res = await bookingApi.create({
        eventId,
        seatIds,
        paymentMethod: method,
      });

      completedRef.current = true;

      navigate('/booking/confirmation', {
        state: { booking: res.data.data, event, selectedSeats },
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Payment failed. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const expired = remainingSeconds <= 0;

  return (
    <div className="page-container">
      <h1>Confirm &amp; Pay</h1>

      <div className="booking-layout">
        <div className="payment-panel">
          <h3>{event?.title}</h3>

          <p className="event-details-meta">
            {event && new Date(event.event_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {event?.start_time && ` · ${event.start_time.slice(0, 5)}`}
          </p>

          <div className={expired ? 'error-box' : 'hold-countdown'}>
            {expired
              ? 'Your seat hold has expired.'
              : `Seats held for ${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')} minutes`}
          </div>

          {error && <div className="error-box">{error}</div>}

          <h4>Payment Method</h4>

          <div className="payment-methods">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.value}
                className={`payment-method ${method === m.value ? 'payment-method-active' : ''}`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.value}
                  checked={method === m.value}
                  disabled={processing || expired}
                  onChange={() => setMethod(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>

          <p className="payment-disclaimer">
            This is a simulated payment for a college project — no real transaction
            will occur and no real card details are collected.
          </p>
        </div>

        <div className="event-details-sidebar">
          <BookingSummary
            selectedSeats={selectedSeats}
            onConfirm={handlePay}
            disabled={processing || expired}
            confirmLabel={
              processing
                ? 'Processing payment...'
                : expired
                  ? 'Hold Expired'
                  : 'Pay Now'
            }
          />

          {expired && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/events/${eventId}`, { replace: true })}
            >
              Select Seats Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
