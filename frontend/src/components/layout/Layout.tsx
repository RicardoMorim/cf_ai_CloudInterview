import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import './Layout.css'; // Assuming you might want a CSS file for layout specific styles

const Layout: React.FC = () => {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content-wrapper">
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default Layout;
