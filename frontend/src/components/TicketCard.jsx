export default function TicketCard({ ticket, booking }) {
  return (
    <div className="ticket-card">
      <div className="ticket-card-main">
        <h4>{booking?.event_title || 'Event'}</h4>
        <p>{booking?.venue_name}, {booking?.venue_city}</p>
        <p className="ticket-card-datetime">
          {booking?.event_date && new Date(booking.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {booking?.start_time && ` · ${booking.start_time.slice(0, 5)}`}
        </p>
        <div className="ticket-card-seat">
          Seat {ticket.seat_row}{ticket.seat_number} &middot; {ticket.seat_class}
        </div>
      </div>
      <div className="ticket-card-stub">
        <span className="ticket-card-code">{ticket.ticket_code}</span>
        <span className={`badge badge-${ticket.ticket_status?.toLowerCase() || 'valid'}`}>
          {ticket.ticket_status || 'VALID'}
        </span>
      </div>
    </div>
  );
}
