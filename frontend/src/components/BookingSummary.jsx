export default function BookingSummary({ selectedSeats, onConfirm, confirmLabel = 'Proceed to Payment', disabled }) {
  const total = selectedSeats.reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <div className="booking-summary">
      <h4>Booking Summary</h4>

      {selectedSeats.length === 0 ? (
        <p className="empty-state-sm">Select seats to see your summary.</p>
      ) : (
        <ul className="booking-summary-list">
          {selectedSeats.map((s) => (
            <li key={s.seat_id}>
              <span>{s.seat_row}{s.seat_number} <em>({s.seat_class})</em></span>
              <span>₹{Number(s.price).toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="booking-summary-row">
        <span>Quantity</span>
        <span>{selectedSeats.length}</span>
      </div>
      <div className="booking-summary-total">
        <span>Total</span>
        <span>₹{total.toLocaleString('en-IN')}</span>
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={disabled || selectedSeats.length === 0}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
