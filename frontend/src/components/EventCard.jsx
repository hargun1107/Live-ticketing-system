import { Link } from 'react-router-dom';

const CATEGORY_COLORS = {
  MUSIC: '#7c3aed',
  SPORTS: '#0891b2',
  THEATRE: '#b45309',
  COMEDY: '#db2777',
  CONFERENCE: '#15803d',
  OTHER: '#475569',
};

export default function EventCard({ event }) {
  const dateLabel = new Date(event.event_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const soldOut = event.available_seats === 0 && event.total_seats > 0;

  return (
    <Link to={`/events/${event.event_id}`} className="event-card">
      <div className="event-card-banner" style={{ background: CATEGORY_COLORS[event.category] || '#475569' }}>
        <span className="event-card-category">{event.category}</span>
        {soldOut && <span className="badge badge-soldout">Sold Out</span>}
      </div>
      <div className="event-card-body">
        <h3>{event.title}</h3>
        <p className="event-card-meta">{dateLabel} &middot; {event.start_time?.slice(0, 5)}</p>
        <p className="event-card-venue">{event.venue_name}, {event.city}</p>
        <div className="event-card-footer">
          <span className="event-card-price">From ₹{Number(event.base_price).toLocaleString('en-IN')}</span>
          {!soldOut && event.available_seats != null && (
            <span className="event-card-seats">{event.available_seats} seats left</span>
          )}
        </div>
      </div>
    </Link>
  );
}
