import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getStats();
      setStats(res.data.data);
    } catch (err) {
      setError('Could not load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Total Events', value: stats.totalEvents },
    { label: 'Total Bookings', value: stats.totalBookings },
    { label: 'Tickets Sold', value: stats.totalTicketsSold },
    { label: 'Revenue', value: `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}` },
    { label: 'Seats Available', value: stats.availableSeats },
    { label: 'Upcoming Events', value: stats.upcomingEvents },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-quicklinks">
          <Link to="/admin/events" className="btn btn-outline btn-sm">Manage Events</Link>
          <Link to="/admin/venues" className="btn btn-outline btn-sm">Manage Venues</Link>
          <Link to="/admin/bookings" className="btn btn-outline btn-sm">All Bookings</Link>
          <Link to="/admin/users" className="btn btn-outline btn-sm">All Users</Link>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="stat-card-value">{c.value}</span>
            <span className="stat-card-label">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="section">
        <h3>Top Performing Events</h3>
        <table className="data-table">
          <thead>
            <tr><th>Event</th><th>Bookings</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {stats.topEvents.map((e) => (
              <tr key={e.event_id}>
                <td>{e.title}</td>
                <td>{e.total_bookings}</td>
                <td>₹{Number(e.revenue).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
