import EventCard from './EventCard';

export default function EventGrid({ events, emptyMessage = 'No events found.' }) {
  if (!events || events.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }
  return (
    <div className="event-grid">
      {events.map((event) => (
        <EventCard key={event.event_id} event={event} />
      ))}
    </div>
  );
}
