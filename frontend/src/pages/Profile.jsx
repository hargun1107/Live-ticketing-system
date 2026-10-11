import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: user?.full_name || '', phone: user?.phone || '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await userApi.update(user.user_id, form);
      const updated = { ...user, full_name: form.fullName, phone: form.phone };
      localStorage.setItem('user', JSON.stringify(updated));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <h1>My Profile</h1>

      <form className="profile-form" onSubmit={handleSave}>
        {error && <div className="error-box">{error}</div>}
        {saved && <div className="success-box">Profile updated successfully.</div>}

        <label>Full Name</label>
        <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

        <label>Email</label>
        <input value={user?.email || ''} disabled />

        <label>Phone</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <label>Role</label>
        <input value={user?.role || ''} disabled />

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
