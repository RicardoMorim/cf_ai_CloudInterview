// Interview Context for managing interview state
import React, { createContext, useContext, useState, useCallback } from 'react';
import { sessionApi, aiApi } from '../services/api';

const InterviewContext = createContext();

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

export const InterviewProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(() => {
    const saved = localStorage.getItem('cloudinterview-current-session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startInterview = useCallback(async (interviewData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create new session
      const sessionResponse = await sessionApi.createSession(interviewData);
      
      if (sessionResponse.success && sessionResponse.data) {
        const session = sessionResponse.data;
        setCurrentSession(session);
        setIsInterviewActive(true);
        localStorage.setItem('cloudinterview-current-session', JSON.stringify(session));
        
        // Get first question
        const questionResponse = await sessionApi.getNextQuestion(session.sessionId);
        if (questionResponse.success && questionResponse.data) {
          setCurrentQuestion(questionResponse.data.question);
          setSessionHistory(prev => [...prev, {
            type: 'question',
            content: questionResponse.data.question,
            timestamp: new Date().toISOString()
          }]);
        }
        
        return session;
      } else {
        throw new Error('Failed to create interview session');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (answerData) => {
    if (!currentSession || !currentQuestion) {
      throw new Error('No active session or question');
    }

    setLoading(true);
    setError(null);
    
    try {
      // Submit answer
      const response = await sessionApi.submitAnswer(currentSession.sessionId, answerData);
      
      if (response.success) {
        // Update session with new answer
        const updatedSession = response.data.session || currentSession;
        setCurrentSession(updatedSession);
        localStorage.setItem('cloudinterview-current-session', JSON.stringify(updatedSession));
        
        // Add to history
        setSessionHistory(prev => [...prev, {
          type: 'answer',
          content: answerData,
          timestamp: new Date().toISOString()
        }]);
        
        // Get next question or feedback
        if (response.data.nextAction?.type === 'completion') {
          // Interview completed
          setIsInterviewActive(false);
          setCurrentQuestion(null);
          
          // Add completion to history
          setSessionHistory(prev => [...prev, {
            type: 'completion',
            content: response.data,
            timestamp: new Date().toISOString()
          }]);
        } else if (response.data.question) {
          // Next question
          setCurrentQuestion(response.data.question);
          setSessionHistory(prev => [...prev, {
            type: 'question',
            content: response.data.question,
            timestamp: new Date().toISOString()
          }]);
        } else if (response.data.aiResponse) {
          // AI response/feedback
          setSessionHistory(prev => [...prev, {
            type: 'ai_response',
            content: response.data.aiResponse,
            timestamp: new Date().toISOString()
          }]);
          
          // Get next question if available
          if (response.data.nextAction?.type === 'question') {
            const nextQuestionResponse = await sessionApi.getNextQuestion(currentSession.sessionId);
            if (nextQuestionResponse.success && nextQuestionResponse.data) {
              setCurrentQuestion(nextQuestionResponse.data.question);
              setSessionHistory(prev => [...prev, {
                type: 'question',
                content: nextQuestionResponse.data.question,
                timestamp: new Date().toISOString()
              }]);
            }
          }
        }
        
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to submit answer');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSession, currentQuestion]);

  const endInterview = useCallback(async () => {
    if (!currentSession) return;

    setLoading(true);
    setError(null);
    
    try {
      // Complete session
      const response = await sessionApi.completeSession(currentSession.sessionId);
      
      if (response.success) {
        // Update session
        const completedSession = { ...currentSession, ...response.data.session };
        setCurrentSession(completedSession);
        localStorage.setItem('cloudinterview-current-session', JSON.stringify(completedSession));
        
        setIsInterviewActive(false);
        setCurrentQuestion(null);
        
        // Add completion to history
        setSessionHistory(prev => [...prev, {
          type: 'completion',
          content: response.data,
          timestamp: new Date().toISOString()
        }]);
        
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to complete interview');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  const clearSession = useCallback(() => {
    setCurrentSession(null);
    setCurrentQuestion(null);
    setSessionHistory([]);
    setIsInterviewActive(false);
    localStorage.removeItem('cloudinterview-current-session');
  }, []);

  const generateQuestion = useCallback(async (jobType, difficulty, questionType) => {
    try {
      const response = await aiApi.generateInterviewQuestion(jobType, difficulty, questionType);
      return response.success ? response.data : null;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const value = {
    currentSession,
    currentQuestion,
    sessionHistory,
    isInterviewActive,
    loading,
    error,
    startInterview,
    submitAnswer,
    endInterview,
    clearSession,
    generateQuestion,
    setSessionHistory,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};