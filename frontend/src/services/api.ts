import axios from 'axios';
import { CreateSessionRequest, InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, Difficulty, QuestionType } from '../types';
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: false,
    timeout: 30000,
});

export const sessionApi = {
    createSession: async (data: CreateSessionRequest): Promise<InterviewSession> => {
        const response = await api.post('/api/sessions', data);
        // Backend returns { success: true, session: ... }
        return response.data.session;
    },

    getNextQuestion: async (sessionId: string): Promise<InterviewQuestion> => {
        const response = await api.get(`/api/sessions/${sessionId}/question/next`);
        return response.data.question;
    },

    submitAnswer: async (sessionId: string, data: Partial<InterviewAnswer>): Promise<{
        success: boolean;
        aiResponse: AIResponse;
        nextQuestion?: InterviewQuestion;
    }> => {
        const response = await api.post(`/api/sessions/${sessionId}/answer`, data);
        return response.data;
    },

    endSession: async (sessionId: string): Promise<any> => {
        const response = await api.post(`/api/sessions/${sessionId}/end`);
        return response.data;
    },

    sendChatMessage: async (sessionId: string, message: string): Promise<{ response: string; session: InterviewSession }> => {
        const response = await api.post(`/api/sessions/${sessionId}/chat`, { message });
        return response.data;
    },

    updateState: async (sessionId: string, state: any) => {
        return fetch(`${API_BASE_URL}/api/sessions/${sessionId}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        }).then(res => res.json());
    }
};

export const aiApi = {
    generateText: async (prompt: string): Promise<any> => {
        const response = await api.post('/api/ai/generate', { prompt });
        return response.data;
    },

    generateInterviewQuestion: async (jobType: string, difficulty: Difficulty, questionType: QuestionType): Promise<any> => {
        const response = await api.post('/api/interview/generate-question', {
            jobType,
            difficulty,
            questionType
        });
        return response.data;
    },

    runCode: async (code: string, language: string): Promise<{ output: string; error?: string }> => {
        const response = await api.post('/api/code/run', { code, language });
        return response.data;
    }
};

export default api;
