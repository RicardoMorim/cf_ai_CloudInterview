// Enhanced Theme Context for managing beautiful themes
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or preference
    const saved = localStorage.getItem('cloudinterview-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cloudinterview-theme-mode');
    return saved || 'vibrant';
  });

  const [animationEnabled, setAnimationEnabled] = useState(() => {
    const saved = localStorage.getItem('cloudinterview-animation');
    return saved !== 'false'; // Default to true
  });

  useEffect(() => {
    // Save theme preferences
    localStorage.setItem('cloudinterview-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('cloudinterview-theme-mode', theme);
    localStorage.setItem('cloudinterview-animation', animationEnabled);

    // Apply theme classes to document
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('dark', 'light', 'vibrant', 'minimal', 'retro');
    root.classList.remove('no-animation');
    
    // Add current theme classes
    root.classList.add(isDark ? 'dark' : 'light');
    root.classList.add(theme);
    if (!animationEnabled) {
      root.classList.add('no-animation');
    }

    // Apply CSS variables based on theme
    applyThemeVariables(isDark, theme);
  }, [isDark, theme, animationEnabled]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const setThemeMode = (newTheme) => {
    setTheme(newTheme);
  };

  const toggleAnimation = () => {
    setAnimationEnabled(!animationEnabled);
  };

  const applyThemeVariables = (isDark, themeMode) => {
    const root = document.documentElement;
    
    if (themeMode === 'vibrant') {
      if (isDark) {
        root.style.setProperty('--primary-color', '#667eea');
        root.style.setProperty('--primary-hover', '#764ba2');
        root.style.setProperty('--secondary-color', '#f093fb');
        root.style.setProperty('--accent-color', '#4facfe');
        root.style.setProperty('--bg-primary', '#0f172a');
        root.style.setProperty('--bg-secondary', '#1e293b');
        root.style.setProperty('--text-primary', '#f8fafc');
        root.style.setProperty('--text-secondary', '#cbd5e1');
      } else {
        root.style.setProperty('--primary-color', '#667eea');
        root.style.setProperty('--primary-hover', '#764ba2');
        root.style.setProperty('--secondary-color', '#f093fb');
        root.style.setProperty('--accent-color', '#4facfe');
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f8fafc');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#4b5563');
      }
    } else if (themeMode === 'minimal') {
      if (isDark) {
        root.style.setProperty('--primary-color', '#6b7280');
        root.style.setProperty('--primary-hover', '#4b5563');
        root.style.setProperty('--secondary-color', '#9ca3af');
        root.style.setProperty('--accent-color', '#d1d5db');
        root.style.setProperty('--bg-primary', '#111827');
        root.style.setProperty('--bg-secondary', '#1f2937');
        root.style.setProperty('--text-primary', '#f9fafb');
        root.style.setProperty('--text-secondary', '#d1d5db');
      } else {
        root.style.setProperty('--primary-color', '#6b7280');
        root.style.setProperty('--primary-hover', '#4b5563');
        root.style.setProperty('--secondary-color', '#9ca3af');
        root.style.setProperty('--accent-color', '#d1d5db');
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f9fafb');
        root.style.setProperty('--text-primary', '#111827');
        root.style.setProperty('--text-secondary', '#6b7280');
      }
    } else if (themeMode === 'retro') {
      if (isDark) {
        root.style.setProperty('--primary-color', '#ff6b6b');
        root.style.setProperty('--primary-hover', '#ff5252');
        root.style.setProperty('--secondary-color', '#4ecdc4');
        root.style.setProperty('--accent-color', '#45b7d1');
        root.style.setProperty('--bg-primary', '#2c3e50');
        root.style.setProperty('--bg-secondary', '#34495e');
        root.style.setProperty('--text-primary', '#ecf0f1');
        root.style.setProperty('--text-secondary', '#bdc3c7');
      } else {
        root.style.setProperty('--primary-color', '#ff6b6b');
        root.style.setProperty('--primary-hover', '#ff5252');
        root.style.setProperty('--secondary-color', '#4ecdc4');
        root.style.setProperty('--accent-color', '#45b7d1');
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f8f9fa');
        root.style.setProperty('--text-primary', '#2c3e50');
        root.style.setProperty('--text-secondary', '#7f8c8d');
      }
    }
  };

  const value = {
    isDark,
    theme,
    animationEnabled,
    toggleTheme,
    setThemeMode,
    toggleAnimation,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};