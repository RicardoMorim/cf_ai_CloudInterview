import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInterview } from '../contexts/InterviewContext';
import CodeIcon from '../assets/icons/code.svg';
import BrainIcon from '../assets/icons/brain.svg';
import ChartIcon from '../assets/icons/chart.svg';
import PlayIcon from '../assets/icons/play.svg';
import ArrowRightIcon from '../assets/icons/arrow-right.svg';
import './HomePage.css';

const HomePage = () => {
  const { startInterview, loading } = useInterview();
  const [selectedMode, setSelectedMode] = useState('technical');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [selectedJobType, setSelectedJobType] = useState('software-engineer');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStartInterview = async () => {
    try {
      await startInterview({
        mode: selectedMode,
        jobType: selectedJobType,
        difficulty: selectedDifficulty,
        duration: 30,
        includeCoding: selectedMode === 'technical',
        topics: selectedMode === 'technical' ? ['algorithms', 'data structures'] : []
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  const features = [
    {
      icon: <img src={CodeIcon} alt="Code" className="feature-icon-svg" />,
      title: 'Technical Interviews',
      description: 'Practice coding challenges, algorithms, and system design questions with real-time AI feedback.',
      color: '#3b82f6',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <img src={BrainIcon} alt="Brain" className="feature-icon-svg" />,
      title: 'Behavioral Questions',
      description: 'Prepare for behavioral interviews with STAR method guidance and personalized feedback.',
      color: '#10b981',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      icon: <img src={ChartIcon} alt="Chart" className="feature-icon-svg" />,
      title: 'Progress Analytics',
      description: 'Track your improvement over time with detailed analytics and personalized recommendations.',
      color: '#f59e0b',
      gradient: 'from-amber-500 to-orange-500'
    }
  ];

  const jobTypes = [
    { value: 'software-engineer', label: 'Software Engineer' },
    { value: 'frontend-developer', label: 'Frontend Developer' },
    { value: 'backend-developer', label: 'Backend Developer' },
    { value: 'fullstack-developer', label: 'Full Stack Developer' },
    { value: 'data-scientist', label: 'Data Scientist' },
    { value: 'devops-engineer', label: 'DevOps Engineer' },
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy', color: 'from-green-500 to-emerald-500' },
    { value: 'medium', label: 'Medium', color: 'from-blue-500 to-cyan-500' },
    { value: 'hard', label: 'Hard', color: 'from-purple-500 to-pink-500' },
    { value: 'expert', label: 'Expert', color: 'from-red-500 to-orange-500' }
  ];

  return (
    <div className="homepage">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="bg-particle" style={{ 
          left: '10%', 
          animationDelay: '0s',
          transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`
        }}></div>
        <div className="bg-particle" style={{ 
          left: '80%', 
          animationDelay: '2s',
          transform: `translate(${mousePosition.x * 0.005}px, ${mousePosition.y * 0.005}px)`
        }}></div>
        <div className="bg-particle" style={{ 
          left: '50%', 
          animationDelay: '4s',
          transform: `translate(${mousePosition.x * 0.015}px, ${mousePosition.y * 0.015}px)`
        }}></div>
      </div>

      {/* Hero Section - Reduced height for better proportions */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text-container">
            <h1 className={`hero-title ${isLoaded ? 'animate-in' : ''}`}>
              <span className="gradient-text">AI-Powered</span> Interview
              <br />Practice Platform
            </h1>
            <p className={`hero-subtitle ${isLoaded ? 'animate-in delay-1' : ''}`}>
              Master your next interview with realistic AI-powered practice sessions.
              Get instant feedback, track your progress, and boost your confidence.
            </p>
          </div>

          <div className={`config-container ${isLoaded ? 'animate-in delay-2' : ''}`}>
            <div className="config-section">
              <h3 className="config-title">Get Started</h3>
              
              {/* Interview Type Selection */}
              <div className="pill-group">
                <button
                  className={`pill-option ${selectedMode === 'technical' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('technical')}
                >
                  <span className="pill-icon">💻</span>
                  Technical
                </button>
                <button
                  className={`pill-option ${selectedMode === 'behavioral' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('behavioral')}
                >
                  <span className="pill-icon">🧠</span>
                  Behavioral
                </button>
              </div>

              {/* Job Type Selection */}
              <div className="select-group">
                <label className="select-label">Job Role</label>
                <div className="custom-select">
                  <select
                    value={selectedJobType}
                    onChange={(e) => setSelectedJobType(e.target.value)}
                    className="select-input"
                  >
                    {jobTypes.map((job) => (
                      <option key={job.value} value={job.value}>
                        {job.label}
                      </option>
                    ))}
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="select-group">
                <label className="select-label">Challenge Level</label>
                <div className="difficulty-grid">
                  {difficulties.map((difficulty) => (
                    <button
                      key={difficulty.value}
                      className={`difficulty-pill ${selectedDifficulty === difficulty.value ? 'active' : ''}`}
                      style={{
                        background: `linear-gradient(135deg, ${difficulty.color})`
                      }}
                      onClick={() => setSelectedDifficulty(difficulty.value)}
                    >
                      {difficulty.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              className="start-button"
              onClick={handleStartInterview}
              disabled={loading}
            >
              <span className="button-glow"></span>
              <img src={PlayIcon} alt="Play" className="button-icon" />
              <span className="button-text">
                {loading ? 'Starting...' : 'Start Interview'}
              </span>
              <img src={ArrowRightIcon} alt="Arrow Right" className="button-icon" />
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="mock-interview-card">
            <div className="interview-header">
              <div className="avatar-container">
                <div className="ai-avatar">
                  <div className="avatar-glow"></div>
                </div>
                <div className="interviewer-info">
                  <span className="interviewer-name">AI Interviewer</span>
                  <span className="interviewer-status">Online</span>
                </div>
              </div>
            </div>
            
            <div className="question-bubble">
              <p>"Explain how you would design a scalable microservices architecture for a social media platform."</p>
            </div>
            
            <div className="response-options">
              <button className="response-btn speaking">
                <span className="btn-icon">🎤</span>
              </button>
              <button className="response-btn typing">
                <span className="btn-icon">📝</span>
              </button>
              <button className="response-btn coding">
                <span className="btn-icon">💻</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-content">
          <div className="section-header">
            <h2 className="section-title">Why Developers Love Us</h2>
            <p className="section-subtitle">
              Join thousands of developers who have transformed their interview skills
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`feature-card ${isLoaded ? 'animate-up' : ''}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="feature-icon-container">
                  <div className={`feature-icon-bg gradient-${feature.gradient}`}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-content">
          <div className="stats-intro">
            <h3 className="stats-title">Trusted by Developers Worldwide</h3>
            <p className="stats-subtitle">Our community's success speaks for itself</p>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Interview Questions</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Practice Sessions</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">4.8★</div>
              <div className="stat-label">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Ace Your Next Interview?</h2>
          <p className="cta-subtitle">
            Join thousands of developers who have improved their interview skills with CloudInterview.
          </p>
          <div className="cta-actions">
            <button className="cta-button primary" onClick={handleStartInterview}>
              Start Practicing Free
            </button>
            <Link to="/questions" className="cta-button secondary">
              Browse Questions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;