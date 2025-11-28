import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../contexts/InterviewContext';
import { InterviewMode, Difficulty, ExperienceLevel } from '../types';
import { FiCode, FiCpu, FiBriefcase, FiUser, FiLayers } from 'react-icons/fi';
import './HomePage.css';

const HomePage: React.FC = () => {
    const { startInterview, loading } = useInterview();
    const navigate = useNavigate();

    const [jobTitle, setJobTitle] = useState('');
    const [jobType, setJobType] = useState('Frontend Developer');
    const [seniority, setSeniority] = useState<ExperienceLevel>(ExperienceLevel.MID);
    const [mode, setMode] = useState<InterviewMode>(InterviewMode.TECHNICAL);
    const [jobDescription, setJobDescription] = useState('');

    const handleStartInterview = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await startInterview({
                mode,
                jobType,
                jobTitle,
                jobDescription,
                seniority,
                difficulty: Difficulty.MEDIUM // Default, could be added to form
            });

            if (mode === InterviewMode.BEHAVIORAL) {
                navigate('/interview/behavioral');
            } else {
                navigate('/interview');
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Failed to start session. Please try again.');
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
                            Practice with our AI-powered interviewer. Tailored to your specific role and seniority.
                        </p>
                    </div>

                    <div className="setup-card">
                        <h2>Configure Your Interview</h2>
                        <form onSubmit={handleStartInterview} className="setup-form">
                            <div className="form-group">
                                <label><FiBriefcase /> Job Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Senior React Developer"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><FiLayers /> Position Type</label>
                                    <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
                                        <option value="Frontend Developer">Frontend Developer</option>
                                        <option value="Backend Developer">Backend Developer</option>
                                        <option value="Fullstack Developer">Fullstack Developer</option>
                                        <option value="DevOps Engineer">DevOps Engineer</option>
                                        <option value="Mobile Developer">Mobile Developer</option>
                                        <option value="Data Scientist">Data Scientist</option>
                                        <option value="Product Manager">Product Manager</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label><FiUser /> Seniority</label>
                                    <select value={seniority} onChange={(e) => setSeniority(e.target.value as ExperienceLevel)}>
                                        <option value={ExperienceLevel.JUNIOR}>Junior</option>
                                        <option value={ExperienceLevel.MID}>Mid-Level</option>
                                        <option value={ExperienceLevel.SENIOR}>Senior</option>
                                        <option value={ExperienceLevel.LEAD}>Lead</option>
                                        <option value={ExperienceLevel.PRINCIPAL}>Principal</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Job Description (Optional)</label>
                                <textarea
                                    placeholder="Paste the job description here for better context..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="mode-selection">
                                <label>Interview Mode</label>
                                <div className="mode-options">
                                    <div
                                        className={`mode-option ${mode === InterviewMode.TECHNICAL ? 'selected' : ''}`}
                                        onClick={() => setMode(InterviewMode.TECHNICAL)}
                                    >
                                        <FiCode />
                                        <span>Technical</span>
                                    </div>
                                    <div
                                        className={`mode-option ${mode === InterviewMode.BEHAVIORAL ? 'selected' : ''}`}
                                        onClick={() => setMode(InterviewMode.BEHAVIORAL)}
                                    >
                                        <FiCpu />
                                        <span>Behavioral</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="cta-button primary full-width"
                                disabled={loading}
                            >
                                {loading ? 'Starting Session...' : 'Start Interview'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
