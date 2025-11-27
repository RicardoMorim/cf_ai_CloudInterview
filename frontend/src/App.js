import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { InterviewProvider } from './contexts/InterviewContext';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

// Page Components
import HomePage from './pages/HomePage';
import InterviewPage from './pages/InterviewPage';
import QuestionsPage from './pages/QuestionsPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotFoundPage from './pages/NotFoundPage';

// Style
import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile device
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <ThemeProvider>
      <UserProvider>
        <InterviewProvider>
          <Router>
            <div className="app">
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
              
              <Header onMenuClick={toggleSidebar} />
              
              <div className="app-content">
                {isMobile && isSidebarOpen && (
                  <div className="sidebar-overlay" onClick={toggleSidebar}></div>
                )}
                
                <Sidebar 
                  isOpen={isSidebarOpen} 
                  isMobile={isMobile}
                  onClose={isMobile ? toggleSidebar : undefined}
                />
                
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/interview" element={<InterviewPage />} />
                    <Route path="/questions" element={<QuestionsPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/404" element={<NotFoundPage />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </main>
              </div>
              
              <Footer />
            </div>
          </Router>
        </InterviewProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
