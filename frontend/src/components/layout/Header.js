import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import Logo from '../../assets/logo.svg';
import MenuIcon from '../../assets/icons/menu.svg';
import SunIcon from '../../assets/icons/sun.svg';
import MoonIcon from '../../assets/icons/moon.svg';
import UserIcon from '../../assets/icons/user.svg';
import './Header.css';

const Header = ({ onMenuClick }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useUser();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', href: '/', exact: true },
    { name: 'Interview', href: '/interview' },
    { name: 'Questions', href: '/questions' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Analytics', href: '/analytics' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    onMenuClick();
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        {/* Logo and Navigation */}
        <div className="header-left">
          <button 
            className="mobile-menu-button"
            onClick={handleMenuToggle}
            aria-label="Toggle menu"
          >
            <img src={MenuIcon} alt="Menu" className="icon menu-icon" />
          </button>
          
          <Link to="/" className="logo">
            <div className="logo-container">
              <img src={Logo} alt="CloudInterview" className="logo-icon" />
              <div className="logo-gradient">
                <span>CloudInterview</span>
              </div>
            </div>
          </Link>

          <nav className="desktop-nav">
            <ul className="nav-list flex-right">
              {navigation.map((item, index) => (
                <li key={item.href} className="nav-item">
                  <Link
                    to={item.href}
                    className={`nav-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
                    style={{ transitionDelay: `${index * 0.1}s ${isScrolled ? 'color-black opacity 0.3s ease' : ''}` }}
                  >
                    <span className="nav-text">{item.name}</span>
                    {isActive(item.href, item.exact) && <div className="nav-indicator"></div>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Right side - Actions */}
        <div className="header-right">
          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <div className="theme-icon-container">
              <img 
                src={isDark ? SunIcon : MoonIcon} 
                alt={isDark ? 'Sun' : 'Moon'} 
                className={`theme-icon ${isDark ? 'sun-active' : 'moon-active'}`}
              />
              <div className="theme-glow"></div>
            </div>
          </button>

          {/* User Menu */}
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                <div className="avatar-container">
                  <img src={UserIcon} alt="User" className="user-icon" />
                  <div className="avatar-glow"></div>
                </div>
              </div>
              <div className="user-details">
                <span className="user-name">
                  {user?.name || 'Guest'}
                </span>
                {user && <span className="user-status">Online</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="mobile-nav">
          <ul className="mobile-nav-list">
            {navigation.map((item, index) => (
              <li key={item.href} className="mobile-nav-item">
                <Link
                  to={item.href}
                  className={`mobile-nav-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
                >
                  <span className="mobile-nav-text">{item.name}</span>
                  {isActive(item.href, item.exact) && <div className="mobile-nav-indicator"></div>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Header;