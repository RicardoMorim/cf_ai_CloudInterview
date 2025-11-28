import React from 'react';
import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiLinkedin, FiCode } from 'react-icons/fi';
import './Footer.css';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content-minimal">
                    <div className="footer-brand-minimal">
                        <Link to="/" className="footer-logo">
                            {React.createElement(FiCode as any, { className: "footer-logo-icon" })}
                            <span>CloudInterview</span>
                        </Link>
                        <p className="footer-description">
                            Master your technical interviews with our AI-powered platform.
                        </p>
                    </div>

                    <div className="footer-actions-minimal">
                        <div className="social-links">
                            <a href="https://github.com/RicardoMorim" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                                {React.createElement(FiGithub as any)}
                            </a>
                            <a href="https://www.linkedin.com/in/ricardo-morim-208368251/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                                {React.createElement(FiLinkedin as any)}
                            </a>
                        </div>
                        <p className="footer-copyright">© {new Date().getFullYear()} CloudInterview AI.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
