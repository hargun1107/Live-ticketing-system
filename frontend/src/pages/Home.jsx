import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '../services/api';
import EventGrid from '../components/EventGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import SearchBar from '../components/SearchBar';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventApi.getAll({ status: 'UPCOMING' });
      setEvents(res.data.data.slice(0, 8));
    } catch (err) {
      setError('Could not load events right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <section className="hero">
        <div className="hero-content">
          <h1>Live events. Real seats. Zero hassle.</h1>
          <p>Book tickets for concerts, sports, theatre and more — see availability update in real time.</p>
          <SearchBar onSearch={(q) => navigate(`/events${q ? `?search=${encodeURIComponent(q)}` : ''}`)} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Upcoming Events</h2>
          <button className="link-btn" onClick={() => navigate('/events')}>View all →</button>
        </div>

        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} onRetry={load} />}
        {!loading && !error && <EventGrid events={events} />}
      </section>
    </div>
  );
}
