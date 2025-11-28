import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInterview } from '../contexts/InterviewContext';
import { InterviewMode, Difficulty } from '../types';
import { FiCode, FiCpu } from 'react-icons/fi';
import './HomePage.css';

const HomePage: React.FC = () => {
    const { startInterview, loading } = useInterview();
    const navigate = useNavigate();

    const handleStartInterview = async (mode: InterviewMode) => {
        try {
            await startInterview({
                mode,
                jobType: 'Frontend Developer', // Default for now
                difficulty: Difficulty.MEDIUM
            });
            navigate('/interview');
        } catch (error) {
            console.error('Failed to start session:', error);
        }
    };

    return (
        <div className="home-page">
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-text-container">
                        <h1 className="hero-title">
                            Master Your <span className="gradient-text">Tech Interview</span>
                        </h1>
                        <p className="hero-subtitle">
                            Practice with our AI-powered interviewer. Get real-time feedback on your coding skills and behavioral answers.
                        </p>

                        <div className="cta-actions">
                            <button
                                className="cta-button primary"
                                onClick={() => handleStartInterview(InterviewMode.TECHNICAL)}
                                disabled={loading}
                            >
                                Start Technical
                            </button>
                            <button
                                className="cta-button secondary"
                                onClick={() => handleStartInterview(InterviewMode.BEHAVIORAL)}
                                disabled={loading}
                            >
                                Start Behavioral
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="features-content">
                    <div className="section-header">
                        <h2 className="section-title">Choose Your Interview Mode</h2>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon-container">
                                <div className="feature-icon-bg">
                                    {React.createElement(FiCode as any, { className: "feature-icon-svg", style: { stroke: 'var(--primary-color)' } })}
                                </div>
                            </div>
                            <h3 className="feature-title">Technical Interview</h3>
                            <p className="feature-description">Practice coding problems, system design, and technical concepts.</p>
                            <button
                                className="button primary small"
                                onClick={() => handleStartInterview(InterviewMode.TECHNICAL)}
                                disabled={loading}
                                style={{ marginTop: '1rem' }}
                            >
                                Start Technical
                            </button>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-container">
                                <div className="feature-icon-bg">
                                    {React.createElement(FiCpu as any, { className: "feature-icon-svg", style: { stroke: 'var(--secondary-color)' } })}
                                </div>
                            </div>
                            <h3 className="feature-title">Behavioral Interview</h3>
                            <p className="feature-description">Master STAR method answers and soft skill questions.</p>
                            <button
                                className="button primary small"
                                onClick={() => handleStartInterview(InterviewMode.BEHAVIORAL)}
                                disabled={loading}
                                style={{ marginTop: '1rem' }}
                            >
                                Start Behavioral
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
