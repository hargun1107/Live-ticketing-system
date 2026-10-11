import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { eventApi } from '../services/api';
import EventGrid from '../components/EventGrid';
import FilterPanel from '../components/FilterPanel';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    date: searchParams.get('date') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await eventApi.getAll(params);
      setEvents(res.data.data);
    } catch (err) {
      setError('Could not load events right now.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => { load(); }, [load]);

  const updateFilters = (newFilters) => {
    const params = Object.fromEntries(Object.entries(newFilters).filter(([, v]) => v));
    setSearchParams(params);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Browse Events</h1>
        <SearchBar initialValue={filters.search} onSearch={(q) => updateFilters({ ...filters, search: q })} />
      </div>

      <div className="events-layout">
        <FilterPanel filters={filters} onChange={updateFilters} onClear={() => setSearchParams({})} />

        <div className="events-results">
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} onRetry={load} />}
          {!loading && !error && (
            <>
              <p className="results-count">{events.length} event{events.length !== 1 ? 's' : ''} found</p>
              <EventGrid events={events} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
