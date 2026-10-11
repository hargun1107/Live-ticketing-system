import { useEffect, useState, useCallback } from 'react';
import { eventApi, venueApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';

const CATEGORIES = ['MUSIC', 'SPORTS', 'THEATRE', 'COMEDY', 'CONFERENCE', 'OTHER'];
const EMPTY_FORM = { title: '', description: '', category: 'MUSIC', venueId: '', eventDate: '', startTime: '', endTime: '', basePrice: '' };

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, venuesRes] = await Promise.all([eventApi.getAll(), venueApi.getAll()]);
      setEvents(eventsRes.data.data);
      setVenues(venuesRes.data.data);
    } catch (err) {
      setError('Could not load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditingId(event.event_id);
    setForm({
      title: event.title,
      description: event.description || '',
      category: event.category,
      venueId: event.venue_id,
      eventDate: event.event_date?.slice(0, 10),
      startTime: event.start_time,
      endTime: event.end_time || '',
      basePrice: event.base_price,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await eventApi.update(editingId, form);
      } else {
        await eventApi.create(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this event? This cannot be undone.')) return;
    try {
      await eventApi.remove(id);
      await load();
    } catch (err) {
      setError('Could not cancel event.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manage Events</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Event</button>
      </div>

      {error && <ErrorMessage message={error} />}

      <table className="data-table">
        <thead>
          <tr><th>Title</th><th>Category</th><th>Date</th><th>Venue</th><th>Price</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.event_id}>
              <td>{e.title}</td>
              <td>{e.category}</td>
              <td>{new Date(e.event_date).toLocaleDateString('en-IN')}</td>
              <td>{e.venue_name}</td>
              <td>₹{Number(e.base_price).toLocaleString('en-IN')}</td>
              <td><span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span></td>
              <td>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(e)}>Edit</button>
                {e.status !== 'CANCELLED' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(e.event_id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Event' : 'Create Event'}
        onClose={() => setModalOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </>
        )}
      >
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <label>Description</label>
          <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="form-row">
            <div>
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Venue</label>
              <select required value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}>
                <option value="">Select a venue</option>
                {venues.map((v) => <option key={v.venue_id} value={v.venue_id}>{v.name} ({v.city})</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>Date</label>
              <input type="date" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
            <div>
              <label>Start Time</label>
              <input type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label>End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>

          <label>Base Price (₹)</label>
          <input type="number" min="0" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
