import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import HomeIcon from '../../assets/icons/home.svg';
import InterviewIcon from '../../assets/icons/interview.svg';
import QuestionsIcon from '../../assets/icons/questions.svg';
import DashboardIcon from '../../assets/icons/dashboard.svg';
import AnalyticsIcon from '../../assets/icons/analytics.svg';
import ProfileIcon from '../../assets/icons/profile.svg';
import SettingsIcon from '../../assets/icons/settings.svg';
import MoonIcon from '../../assets/icons/moon.svg';
import SunIcon from '../../assets/icons/sun.svg';
import './Sidebar.css';

const Sidebar = ({ isOpen, isMobile, onClose }) => {
  const { isDark } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Interview', href: '/interview', icon: InterviewIcon },
    { name: 'Questions', href: '/questions', icon: QuestionsIcon },
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
    { name: 'Analytics', href: '/analytics', icon: AnalyticsIcon },
    { name: 'Profile', href: '/profile', icon: ProfileIcon },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const sidebarClass = `sidebar ${isOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : 'desktop'}`;

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile && isOpen && onClose) {
      onClose();
    }
  }, [location.pathname, isMobile, isOpen, onClose]);

  return (
    <>
      <div className={sidebarClass}>
        <div className="sidebar-content">
          {/* Logo */}
          <div className="sidebar-logo">
            <Link to="/" onClick={handleLinkClick}>
              <div className="logo-container">
                <div className="logo-icon">
                  <div className="logo-glow"></div>
                </div>
                <span className="logo-text">CloudInterview</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            <ul className="nav-list">
              {navigation.map((item, index) => (
                <li key={item.href} className="nav-item">
                  <Link
                    to={item.href}
                    className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
                    onClick={handleLinkClick}
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    <div className="nav-icon-container">
                      <img src={item.icon} alt={item.name} className="nav-icon" />
                      <div className="icon-glow"></div>
                    </div>
                    <span className="nav-text">{item.name}</span>
                    {isActive(item.href) && (
                      <div className="nav-indicator">
                        <div className="indicator-dot"></div>
                        <div className="indicator-line"></div>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Theme Toggle */}
          <div className="sidebar-theme">
            <button className="theme-button">
              <div className="theme-icon-container">
                <img src={isDark ? SunIcon : MoonIcon} alt={isDark ? 'Sun' : 'Moon'} className="theme-icon" />
                <div className="theme-glow"></div>
              </div>
              <span className="theme-text">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>

          {/* User Actions */}
          <div className="sidebar-actions">
            <Link to="/profile" className="action-link" onClick={handleLinkClick}>
              <div className="action-icon-container">
                <img src={SettingsIcon} alt="Settings" className="action-icon" />
                <div className="action-glow"></div>
              </div>
              <span className="action-text">Settings</span>
            </Link>
          </div>

          {/* Decorative Elements */}
          <div className="sidebar-decoration">
            <div className="decoration-circle"></div>
            <div className="decoration-line"></div>
            <div className="decoration-glow"></div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
        ></div>
      )}
    </>
  );
};

export default Sidebar;