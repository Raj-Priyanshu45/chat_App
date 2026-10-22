import { NavLink } from 'react-router-dom';
import { MdExplore, MdHome, MdPerson, MdSearch } from 'react-icons/md';
import { motion } from 'motion/react';
import useAuth from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { requestPaletteOpen } from './WorkspaceCommandPalette';

const AppNav = () => {
    const auth = useAuth();
    const username = auth.user?.username || auth.user?.name || 'member';
    const initials = username.slice(0, 2).toUpperCase();
    const linkClass = ({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`;

    return (
        <header className="app-nav">
            <NavLink to="/" className="brand-lockup" aria-label="Go to home">
                <span className="brand-mark" aria-hidden="true">C</span>
                <span className="brand-copy">
          <span className="brand-name">ChatCom</span>
          <span className="brand-subtitle">real-time workspace</span>
        </span>
            </NavLink>

            <nav className="app-nav-links" aria-label="Primary navigation">
                <NavLink to="/" end className={linkClass}>
                    {({ isActive }) => <>
                        {isActive && <motion.span className="app-nav-active-pill" layoutId="app-nav-active-pill" aria-hidden="true" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                        <MdHome size={16} />Home
                    </>}
                </NavLink>
                <NavLink to="/discover" className={linkClass}>
                    {({ isActive }) => <>
                        {isActive && <motion.span className="app-nav-active-pill" layoutId="app-nav-active-pill" aria-hidden="true" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                        <MdExplore size={16} />Discover
                    </>}
                </NavLink>
                <NavLink to="/profile" className={linkClass}>
                    {({ isActive }) => <>
                        {isActive && <motion.span className="app-nav-active-pill" layoutId="app-nav-active-pill" aria-hidden="true" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                        <MdPerson size={16} />Profile
                    </>}
                </NavLink>
            </nav>

            <div className="nav-utility-actions">
                <button type="button" className="nav-command-button" onClick={requestPaletteOpen} title="Search pages and rooms (⌘K)" aria-label="Open command palette">
                    <MdSearch size={17} /><span>Search</span><kbd>⌘ K</kbd>
                </button>
                <ThemeToggle compact />
                <div className="nav-user">
                    <div className="nav-user-copy">
                        <span className="nav-user-name">@{username}</span>
                        <span className="nav-user-meta">signed in</span>
                    </div>
                    <span className="nav-user-avatar" aria-hidden="true">{initials}</span>
                </div>
            </div>
        </header>
    );
};

export default AppNav;