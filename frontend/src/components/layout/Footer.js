import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../../assets/logo.svg';
import './Footer.css';

const Footer = () => {
  const { isDark } = useTheme();
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { category: 'Product', links: [
      { name: 'Interview Practice', href: '/interview' },
      { name: 'Question Bank', href: '/questions' },
      { name: 'Progress Tracking', href: '/dashboard' },
      { name: 'Performance Analytics', href: '/analytics' }
    ]},
    { category: 'Resources', links: [
      { name: 'Documentation', href: '#' },
      { name: 'API Reference', href: '#' },
      { name: 'Help Center', href: '#' },
      { name: 'Community', href: '#' }
    ]},
    { category: 'Company', links: [
      { name: 'About Us', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Contact Us', href: '#' }
    ]}
  ];

  const socialLinks = [
    { name: 'Twitter', icon: '🐦', href: '#' },
    { name: 'LinkedIn', icon: '💼', href: '#' },
    { name: 'GitHub', icon: '💻', href: '#' },
    { name: 'YouTube', icon: '🎥', href: '#' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Main Footer Grid */}
          <div className="footer-grid">
            {/* Brand Section */}
            <div className="footer-brand">
              <div 
                className={`footer-logo-container ${isLogoHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setIsLogoHovered(true)}
                onMouseLeave={() => setIsLogoHovered(false)}
              >
                <div className="footer-logo-wrapper">
                  <img src={Logo} alt="CloudInterview" className="footer-logo" />
                  <div className="logo-pulse"></div>
                  <div className="logo-glow"></div>
                </div>
              </div>
              <p className="footer-description">
                AI-powered interview practice platform designed to help you ace your technical and behavioral interviews.
              </p>
              <div className="social-links">
                {socialLinks.map((social, index) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="social-link"
                    style={{ transitionDelay: `${index * 0.1}s` }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="social-icon">{social.icon}</span>
                    <span className="social-tooltip">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Links Sections */}
            {quickLinks.map((section, sectionIndex) => (
              <div key={section.category} className="footer-section">
                <h3 className="footer-section-title">{section.category}</h3>
                <ul className="footer-links">
                  {section.links.map((link, linkIndex) => (
                    <li key={link.name} className="footer-link-item">
                      <a
                        href={link.href}
                        className="footer-link"
                        style={{ transitionDelay: `${sectionIndex * 0.1 + linkIndex * 0.05}s` }}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Newsletter Section */}
            <div className="footer-newsletter">
              <h3 className="footer-section-title">Stay Updated</h3>
              <p className="newsletter-description">
                Get the latest interview tips and platform updates straight to your inbox.
              </p>
              <form className="newsletter-form">
                <div className="newsletter-input-group">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="newsletter-input"
                    required
                  />
                  <button type="submit" className="newsletter-button">
                    <span className="button-text">Subscribe</span>
                    <span className="button-icon">→</span>
                  </button>
                </div>
                <p className="newsletter-privacy">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>
            </div>
          </div>

          {/* Divider */}
          <div className="footer-divider">
            <div className="divider-line"></div>
          </div>

          {/* Bottom Section */}
          <div className="footer-bottom">
            <div className="footer-legal">
              <p className="footer-copyright">
                © {currentYear} CloudInterview. Built with AI and ❤️ for developers.
              </p>
              <div className="footer-legal-links">
                <a href="#" className="footer-legal-link">Privacy</a>
                <a href="#" className="footer-legal-link">Terms</a>
                <a href="#" className="footer-legal-link">Cookies</a>
                <a href="#" className="footer-legal-link">Sitemap</a>
              </div>
            </div>

            {/* Back to Top Button */}
            <button 
              className="back-to-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Back to top"
            >
              <span className="arrow-up">↑</span>
              <span className="top-glow"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="footer-decoration">
        <div className="decoration-wave"></div>
        <div className="decoration-gradient"></div>
        <div className="decoration-particles">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;