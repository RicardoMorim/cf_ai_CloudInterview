import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  const handleGoBack = () => {
    navigate(-1);
    setIsConfettiActive(true);
    setTimeout(() => setIsConfettiActive(false), 2000);
  };

  const handleGoHome = () => {
    navigate('/');
    setIsConfettiActive(true);
    setTimeout(() => setIsConfettiActive(false), 2000);
  };

  return (
    <div className="not-found">
      {/* Animated Background */}
      <div className="not-found-bg">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
        <div className="bg-shape shape-4"></div>
      </div>

      {/* Confetti Animation */}
      {isConfettiActive && (
        <div className="confetti-container">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'][Math.floor(Math.random() * 5)]
              }}
            ></div>
          ))}
        </div>
      )}

      <div className="not-found-content">
        {/* 404 Icon with Animation */}
        <div className="not-found-icon-container">
          <div className="icon-404">
            <div className="number-4">4</div>
            <div className="confused-face">
              <div className="eye left"></div>
              <div className="eye right"></div>
              <div className="mouth"></div>
            </div>
            <div className="number-4">4</div>
          </div>
          <div className="icon-glow"></div>
        </div>

        <h1 className="not-found-title">Oops! Page Not Found</h1>
        <p className="not-found-subtitle">
          The page you're looking for doesn't exist or has been moved to a secret location.
        </p>

        {/* Error Details */}
        <div className="error-details">
          <div className="error-code">Error Code: 404</div>
          <div className="error-message">File Not Found</div>
        </div>

        {/* Action Buttons */}
        <div className="not-found-actions">
          <button 
            className={`button primary ${isButtonHovered ? 'hovered' : ''}`}
            onClick={handleGoBack}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
          >
            <div className="button-content">
              <img src={ArrowLeftIcon} alt="Arrow Left" className="button-icon" />
              <span className="button-text">Go Back</span>
            </div>
            <div className="button-glow"></div>
          </button>
          
          <button 
            className="button secondary"
            onClick={handleGoHome}
          >
            <span className="button-text">Go Home</span>
          </button>
        </div>

        {/* Fun Fact */}
        <div className="fun-fact">
          <div className="fact-icon">💡</div>
          <p className="fact-text">
            Did you know? The average website has a 404 error rate of 0.5%. You're part of an exclusive club!
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="floating-elements">
        <div className="floating-code">
          <div className="code-line error-line">404: Page not found</div>
          <div className="code-line">return null;</div>
        </div>
        <div className="floating-chart">
          <div className="chart-bar" style={{height: '20%', backgroundColor: '#ef4444'}}></div>
          <div className="chart-bar" style={{height: '80%', backgroundColor: '#10b981'}}></div>
          <div className="chart-bar" style={{height: '40%', backgroundColor: '#f59e0b'}}></div>
          <div className="chart-bar" style={{height: '60%', backgroundColor: '#8b5cf6'}}></div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;