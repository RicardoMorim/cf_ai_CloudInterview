import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { interviewService } from '../services/interviewService';
import { InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, CreateSessionRequest, InterviewMode, Difficulty, QuestionType } from '../types';

interface InterviewContextType {
    currentSession: InterviewSession | null;
    currentQuestion: InterviewQuestion | null;
    sessionHistory: any[];
    isInterviewActive: boolean;
    loading: boolean;
    error: string | null;
    startInterview: (data: CreateSessionRequest) => Promise<InterviewSession>;
    submitAnswer: (data: Partial<InterviewAnswer>) => Promise<any>;
    endInterview: () => Promise<any>;
    clearSession: () => void;
    generateQuestion: (jobType: string, difficulty: Difficulty, questionType: QuestionType) => Promise<any>;
    setSessionHistory: React.Dispatch<React.SetStateAction<any[]>>;
    updateState: (data: any) => Promise<void>;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const useInterview = () => {
    const context = useContext(InterviewContext);
    if (!context) {
        throw new Error('useInterview must be used within an InterviewProvider');
    }
    return context;
};

interface InterviewProviderProps {
    children: ReactNode;
}

export const InterviewProvider: React.FC<InterviewProviderProps> = ({ children }) => {
    const [currentSession, setCurrentSession] = useState<InterviewSession | null>(() => {
        return interviewService.loadSessionFromStorage();
    });
    const [isInterviewActive, setIsInterviewActive] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
    const [sessionHistory, setSessionHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Restore state from session on mount/update
    useEffect(() => {
        if (currentSession) {
            setIsInterviewActive(true);

            // Restore current question
            if (!currentQuestion && currentSession.questions && currentSession.questions.length > 0) {
                const index = currentSession.currentQuestionIndex || 0;
                if (index < currentSession.questions.length) {
                    setCurrentQuestion(currentSession.questions[index]);
                }
            }

            // Restore history if empty
            if (sessionHistory.length === 0) {
                const history: any[] = [];

                // Add questions
                currentSession.questions?.forEach((q, idx) => {
                    // Only add questions that have been reached
                    if (idx <= (currentSession.currentQuestionIndex || 0)) {
                        history.push({
                            type: 'question',
                            content: q,
                            timestamp: new Date().toISOString() // Approximate if not stored
                        });
                    }
                });

                // Add answers
                currentSession.answers?.forEach(a => {
                    history.push({
                        type: 'answer',
                        content: a,
                        timestamp: a.submittedAt
                    });
                });

                // Add AI responses
                currentSession.aiResponses?.forEach(r => {
                    history.push({
                        type: 'ai_response',
                        content: r,
                        timestamp: r.generatedAt
                    });
                });

                // Sort by timestamp
                history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                if (history.length > 0) {
                    setSessionHistory(history);
                }
            }
        }
    }, [currentSession, currentQuestion, sessionHistory.length]);

    const startInterview = useCallback(async (interviewData: CreateSessionRequest) => {
        setLoading(true);
        setError(null);

        try {
            const session = await interviewService.startInterview(interviewData);

            setCurrentSession(session);
            setIsInterviewActive(true);

            return session;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const submitAnswer = useCallback(async (answerData: Partial<InterviewAnswer>) => {
        if (!currentSession || !currentQuestion) {
            throw new Error('No active session or question');
        }

        setLoading(true);
        setError(null);

        try {
            const { aiResponse, nextQuestion } = await interviewService.submitAnswer(
                currentSession.sessionId,
                answerData
            );

            // Add to history
            setSessionHistory(prev => [...prev, {
                type: 'answer',
                content: answerData,
                timestamp: new Date().toISOString()
            }]);

            // Handle AI Response
            if (aiResponse) {
                setSessionHistory(prev => [...prev, {
                    type: 'ai_response',
                    content: aiResponse,
                    timestamp: new Date().toISOString()
                }]);
            }

            // Handle Next Question (if any)
            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                setSessionHistory(prev => [...prev, {
                    type: 'question',
                    content: nextQuestion,
                    timestamp: new Date().toISOString()
                }]);
            }

            return { aiResponse, nextQuestion };
        } catch (err: any) {
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
            const response = await interviewService.endInterview(currentSession.sessionId);

            setIsInterviewActive(false);
            setCurrentQuestion(null);

            return response;
        } catch (err: any) {
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
        interviewService.clearSessionFromStorage();
    }, []);

    // Keep generateQuestion for now (uses aiApi directly - can be moved to service later)
    const generateQuestion = useCallback(async (jobType: string, difficulty: Difficulty, questionType: QuestionType) => {
        // This method is not currently used, can be deprecated or moved to service
        return null;
    }, []);

    const updateState = useCallback(async (data: any) => {
        if (!currentSession) return;
        try {
            await interviewService.updateSessionState(currentSession.sessionId, data);
        } catch (err) {
            console.error("Failed to update session state:", err);
        }
    }, [currentSession]);

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
        updateState,
    };

    return (
        <InterviewContext.Provider value={value}>
            {children}
        </InterviewContext.Provider>
    );
};
