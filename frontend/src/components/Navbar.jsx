import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          🎟️ StageOne
        </Link>

        <nav className="navbar-links">
          <Link to="/events">Events</Link>
          {user && <Link to="/my-bookings">My Bookings</Link>}
          {isAdmin && <Link to="/admin">Admin</Link>}
        </nav>

        <div className="navbar-actions">
          {user ? (
            <div className="navbar-user">
              <Link to="/profile" className="navbar-username">
                {user.full_name?.split(' ')[0] || 'Profile'}
              </Link>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
