// User Context for managing user state
import React, { createContext, useContext, useState, useEffect } from 'react';
import { userApi } from '../services/api';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cloudinterview-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate a random user ID if none exists
  const generateUserId = () => {
    let userId = localStorage.getItem('cloudinterview-userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cloudinterview-userId', userId);
    }
    return userId;
  };

  const initializeUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userId = generateUserId();
      
      // Create or get user profile
      const userData = {
        userId,
        name: `User ${userId.substring(userId.length - 6)}`,
        email: `${userId}@example.com`,
        profile: {
          jobTitles: [],
          experienceLevel: 'mid',
          primaryLanguages: ['javascript'],
          industries: [],
          resumeSummary: '',
          areasOfInterest: [],
        },
        preferences: {
          defaultMode: 'technical',
          defaultDifficulty: 'medium',
          languagePreferences: [],
          feedbackStyle: 'detailed',
          voiceInputEnabled: false,
          darkMode: false,
          notifications: {
            emailNotifications: false,
            sessionReminders: false,
            progressUpdates: true,
            marketing: false,
          },
        },
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        sessions: [],
      };

      setUser(userData);
      localStorage.setItem('cloudinterview-user', JSON.stringify(userData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('cloudinterview-user', JSON.stringify(updatedUser));
  };

  const updateUserProfile = async (profileData) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedUser = { ...user, profile: { ...user.profile, ...profileData } };
      updateUser(updatedUser);
      
      // TODO: Save to backend when API is ready
      // await userApi.updateProfile(user.userId, profileData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPreferences = async (preferencesData) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedUser = { ...user, preferences: { ...user.preferences, ...preferencesData } };
      updateUser(updatedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('cloudinterview-user');
    localStorage.removeItem('cloudinterview-userId');
  };

  // Initialize user on mount
  useEffect(() => {
    if (!user) {
      initializeUser();
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    initializeUser,
    updateUser,
    updateUserProfile,
    updateUserPreferences,
    signOut,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};