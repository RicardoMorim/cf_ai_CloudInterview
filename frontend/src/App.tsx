import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { InterviewProvider } from './contexts/InterviewContext';
import HomePage from './pages/HomePage';
import InterviewPage from './pages/InterviewPage';
import BehavioralInterviewPage from './pages/BehavioralInterviewPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import QuestionsPage from './pages/QuestionsPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/layout/Layout';
import './App.css';

function App() {
    return (
        <ThemeProvider>
            <InterviewProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<HomePage />} />
                            <Route path="interview" element={<InterviewPage />} />
                            <Route path="interview/behavioral" element={<BehavioralInterviewPage />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="analytics" element={<AnalyticsPage />} />
                            <Route path="questions" element={<QuestionsPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>
                    </Routes>
                </Router>
            </InterviewProvider>
        </ThemeProvider>
    );
}

export default App;
