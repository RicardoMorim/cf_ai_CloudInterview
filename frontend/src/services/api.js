// API Client for CloudInterview Backend

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 500) {
      console.error('Server error occurred');
    }
    
    return Promise.reject(error);
  }
);

// API Endpoints

// Session Management
export const sessionApi = {
  // Create new interview session
  createSession: async (data) => {
    const response = await api.post('/api/sessions', data);
    return response.data;
  },

  // Get next question in session
  getNextQuestion: async (sessionId) => {
    const response = await api.get(`/api/sessions/${sessionId}/question/next`);
    return response.data;
  },

  // Submit answer to current question
  submitAnswer: async (sessionId, data) => {
    const response = await api.post(`/api/sessions/${sessionId}/answer`, data);
    return response.data;
  },

  // Complete session and get feedback
  completeSession: async (sessionId) => {
    const response = await api.post(`/api/sessions/${sessionId}/complete`);
    return response.data;
  },

  // Get session details
  getSession: async (sessionId) => {
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  },
};

// Question Bank
export const questionApi = {
  // Get questions by criteria
  getQuestions: async (params = {}) => {
    const response = await api.get('/api/questions', { params });
    return response.data;
  },

  // Get random questions
  getRandomQuestions: async (count = 10, difficulty, type) => {
    const response = await api.get('/api/questions/random', { 
      params: { count, difficulty, type } 
    });
    return response.data;
  },

  // Get question by ID
  getQuestion: async (questionId) => {
    const response = await api.get(`/api/questions/${questionId}`);
    return response.data;
  },

  // Search questions
  searchQuestions: async (query) => {
    const response = await api.get('/api/questions/search', { params: { q: query } });
    return response.data;
  },

  // Get available filters
  getFilters: async () => {
    const response = await api.get('/api/questions/filters');
    return response.data;
  },
};

// AI Features
export const aiApi = {
  // Generate text with AI
  generateText: async (prompt) => {
    const response = await api.post('/api/ai/generate', { prompt });
    return response.data;
  },

  // Generate interview question
  generateInterviewQuestion: async (jobType, difficulty, questionType) => {
    const response = await api.post('/api/interview/generate-question', {
      jobType,
      difficulty,
      questionType
    });
    return response.data;
  },
};

// User Management
export const userApi = {
  // Get user profile
  getProfile: async (userId) => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (userId, data) => {
    const response = await api.put(`/api/users/${userId}/profile`, data);
    return response.data;
  },

  // Get user sessions
  getUserSessions: async (userId, limit = 20, offset = 0) => {
    const response = await api.get(`/api/users/${userId}/sessions`, {
      params: { limit, offset }
    });
    return response.data;
  },

  // Get user statistics
  getUserStats: async (userId) => {
    const response = await api.get(`/api/users/${userId}/stats`);
    return response.data;
  },
};

// Feedback and Analytics
export const feedbackApi = {
  // Get feedback for session
  getSessionFeedback: async (sessionId) => {
    const response = await api.get(`/api/sessions/${sessionId}/feedback`);
    return response.data;
  },

  // Get user progress report
  getProgressReport: async (userId) => {
    const response = await api.get(`/api/users/${userId}/progress`);
    return response.data;
  },

  // Generate recommendations
  getRecommendations: async (userId) => {
    const response = await api.get(`/api/users/${userId}/recommendations`);
    return response.data;
  },
};

// Health check
export const healthApi = {
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;