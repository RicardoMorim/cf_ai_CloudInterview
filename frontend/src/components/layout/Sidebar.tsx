import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { FiHome, FiGrid, FiBarChart2, FiUser, FiCode } from 'react-icons/fi';

const Sidebar: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <Link to="/" className="logo-link">
                    {React.createElement(FiCode as any, { className: "logo-icon" })}
                    <h1>CloudInterview</h1>
                </Link>
            </div>

            <nav className="sidebar-nav">
                <Link to="/" className={`nav-item ${isActive('/')}`}>
                    {React.createElement(FiHome as any, { className: "nav-icon" })}
                    <span>Home</span>
                </Link>
                <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                    {React.createElement(FiGrid as any, { className: "nav-icon" })}
                    <span>Dashboard</span>
                </Link>
                <Link to="/analytics" className={`nav-item ${isActive('/analytics')}`}>
                    {React.createElement(FiBarChart2 as any, { className: "nav-icon" })}
                    <span>Analytics</span>
                </Link>
                <Link to="/profile" className={`nav-item ${isActive('/profile')}`}>
                    {React.createElement(FiUser as any, { className: "nav-icon" })}
                    <span>Profile</span>
                </Link>
            </nav>
        </aside>
    );
};

export default Sidebar;
