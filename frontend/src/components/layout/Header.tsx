import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';
import { FiSun, FiMoon, FiUser } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';

const Header: React.FC = () => {
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return 'Home';
            case '/interview': return 'Interview';
            case '/dashboard': return 'Dashboard';
            case '/profile': return 'Profile';
            case '/analytics': return 'Analytics';
            case '/questions': return 'Question Bank';
            default: return '';
        }
    };

    return (
        <header className={`header ${window.scrollY > 20 ? 'scrolled' : ''}`}>
            <div className="header-container">
                <div className="header-left">
                    <Link to="/" className="logo">
                        <div className="logo-gradient">CloudInterview</div>
                    </Link>

                    <nav className="desktop-nav">
                        <ul className="nav-list">
                            <li><Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link></li>
                            <li><Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
                        </ul>
                    </nav>
                </div>

                <div className="header-right">
                    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                        {isDark ? React.createElement(FiSun as any, { className: "theme-icon" }) : React.createElement(FiMoon as any, { className: "theme-icon" })}
                    </button>

                    <div className="user-menu">
                        <div className="user-avatar">
                            {React.createElement(FiUser as any, { className: "user-icon" })}
                        </div>
                        <div className="user-info">
                            <span className="user-name">User</span>
                            <span className="user-status">Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
