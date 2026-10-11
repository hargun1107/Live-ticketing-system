import { useMemo } from 'react';
import Seat from './Seat';

// Groups a flat seat list into rows and renders an interactive map.
// Selection state is lifted to the parent (EventDetails/Booking page)
// so the running total can be shown alongside the map.
export default function SeatMap({ seats, selectedSeatIds, onToggleSeat }) {
  const rows = useMemo(() => {
    const grouped = {};
    seats.forEach((seat) => {
      if (!grouped[seat.seat_row]) grouped[seat.seat_row] = [];
      grouped[seat.seat_row].push(seat);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  return (
    <div className="seat-map">
      <div className="seat-map-screen">STAGE / SCREEN</div>

      {rows.map(([rowLabel, rowSeats]) => (
        <div key={rowLabel} className="seat-row">
          <span className="seat-row-label">{rowLabel}</span>
          <div className="seat-row-seats">
            {rowSeats
              .sort((a, b) => a.seat_number - b.seat_number)
              .map((seat) => (
                <Seat
                  key={seat.seat_id}
                  seat={seat}
                  isSelected={selectedSeatIds.includes(seat.seat_id)}
                  onToggle={onToggleSeat}
                />
              ))}
          </div>
        </div>
      ))}

      <div className="seat-legend">
        <span><i className="legend-dot seat-general" /> General</span>
        <span><i className="legend-dot seat-premium" /> Premium</span>
        <span><i className="legend-dot seat-vip" /> VIP</span>
        <span><i className="legend-dot seat-selected" /> Selected</span>
        <span><i className="legend-dot seat-booked" /> Booked</span>
      </div>
    </div>
  );
}
