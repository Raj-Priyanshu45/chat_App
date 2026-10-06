import { NavLink } from 'react-router-dom';
import { MdExplore, MdHome, MdPerson } from 'react-icons/md';
import useAuth from '../context/AuthContext';

const AppNav = ({ active = 'home' }) => {
  const auth = useAuth();
  const username = auth.user?.username || auth.user?.name || 'member';
  const initials = username.slice(0, 2).toUpperCase();

  const linkClass = ({ isActive }) =>
    `app-nav-link ${isActive || active === 'home' && isActive ? 'is-active' : ''}`;

  return (
    <header className="app-nav">
      <NavLink to="/" className="brand-lockup" aria-label="Go to home">
        <span className="brand-mark" aria-hidden="true">co</span>
        <span className="brand-copy">
          <span className="brand-name">conduit</span>
          <span className="brand-subtitle">real-time workspace</span>
        </span>
      </NavLink>

      <nav className="app-nav-links" aria-label="Primary navigation">
        <NavLink to="/" end className={linkClass}>
          <MdHome size={16} />
          Home
        </NavLink>
        <NavLink to="/discover" className={({ isActive }) => `app-nav-link ${isActive || active === 'discover' ? 'is-active' : ''}`}>
          <MdExplore size={16} />
          Discover
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `app-nav-link ${isActive || active === 'profile' ? 'is-active' : ''}`}>
          <MdPerson size={16} />
          Profile
        </NavLink>
      </nav>

      <div className="nav-user">
        <div className="nav-user-copy">
          <span className="nav-user-name">@{username}</span>
          <span className="nav-user-meta">online</span>
        </div>
        <span className="nav-user-avatar" aria-hidden="true">{initials}</span>
      </div>
    </header>
  );
};

export default AppNav;
