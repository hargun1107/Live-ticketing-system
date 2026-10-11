export default function Seat({ seat, isSelected, onToggle }) {
  const isBooked = seat.status === 'BOOKED';
  const isHeld = seat.status === 'LOCKED';
  const isUnavailable = isBooked || isHeld;

  let className = 'seat';

  if (isBooked) {
    className += ' seat-booked';
  } else if (isHeld) {
    className += ' seat-booked';
  } else if (isSelected) {
    className += ' seat-selected';
  } else {
    className += ` seat-${seat.seat_class?.toLowerCase() || 'general'}`;
  }

  return (
    <button
      type="button"
      className={className}
      disabled={isUnavailable}
      title={`${seat.seat_row}${seat.seat_number} · ${
        isBooked ? 'Booked' : isHeld ? 'Temporarily held' : seat.seat_class
      } · ₹${seat.price}`}
      onClick={() => !isUnavailable && onToggle(seat)}
    >
      {seat.seat_number}
    </button>
  );
}