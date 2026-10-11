import { useEffect, useState, useCallback } from 'react';
import { venueApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';

const EMPTY_FORM = { name: '', address: '', city: '', state: '', capacity: '' };

export default function AdminVenues() {
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
      const res = await venueApi.getAll();
      setVenues(res.data.data);
    } catch (err) {
      setError('Could not load venues.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (v) => {
    setEditingId(v.venue_id);
    setForm({ name: v.name, address: v.address, city: v.city, state: v.state || '', capacity: v.capacity });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await venueApi.update(editingId, form);
      else await venueApi.create(form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save venue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this venue? Only possible if it has no events.')) return;
    try {
      await venueApi.remove(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete venue (it may have events attached).');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manage Venues</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Venue</button>
      </div>

      {error && <ErrorMessage message={error} />}

      <table className="data-table">
        <thead><tr><th>Name</th><th>City</th><th>Capacity</th><th>Actions</th></tr></thead>
        <tbody>
          {venues.map((v) => (
            <tr key={v.venue_id}>
              <td>{v.name}</td>
              <td>{v.city}, {v.state}</td>
              <td>{v.capacity}</td>
              <td>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.venue_id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Venue' : 'Create Venue'}
        onClose={() => setModalOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Venue'}
            </button>
          </>
        )}
      >
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Address</label>
          <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="form-row">
            <div>
              <label>City</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label>State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <label>Capacity</label>
          <input type="number" min="1" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
