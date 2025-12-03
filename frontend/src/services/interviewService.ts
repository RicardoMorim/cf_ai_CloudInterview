import { sessionApi } from './api';
import { storageService } from './storageService';
import {
    CreateSessionRequest,
    InterviewSession,
    InterviewQuestion,
    InterviewAnswer,
    AIResponse
} from '../types';

/**
 * Interview Service - Handles all interview business logic
 * Abstracts API calls and provides clean interface for components
 */
export class InterviewService {
    private STORAGE_KEY = 'current-session';

    /**
     * Start a new interview session
     * @param config - Session configuration
     * @returns Created interview session
     */
    async startInterview(config: CreateSessionRequest): Promise<InterviewSession> {
        try {
            const session = await sessionApi.createSession(config);

            // Save to localStorage for persistence
            storageService.save(this.STORAGE_KEY, session);

            return session;
        } catch (error) {
            console.error('Failed to start interview:', error);
            throw new Error('Could not start interview. Please try again.');
        }
    }

    /**
     * Submit an answer and get AI response + next question
     * @param sessionId - Current session ID
     * @param answer - Answer data
     * @returns AI response and optional next question
     */
    async submitAnswer(
        sessionId: string,
        answer: Partial<InterviewAnswer>
    ): Promise<{
        aiResponse: AIResponse;
        nextQuestion?: InterviewQuestion;
    }> {
        try {
            const response = await sessionApi.submitAnswer(sessionId, answer);
            return {
                aiResponse: response.aiResponse,
                nextQuestion: response.nextQuestion
            };
        } catch (error) {
            console.error('Failed to submit answer:', error);
            throw new Error('Could not submit answer. Please try again.');
        }
    }

    /**
     * End the current interview session
     * @param sessionId - Session ID to end
     * @returns End session result
     */
    async endInterview(sessionId: string): Promise<any> {
        try {
            const result = await sessionApi.endSession(sessionId);

            // Clear from localStorage
            storageService.remove(this.STORAGE_KEY);

            return result;
        } catch (error) {
            console.error('Failed to end interview:', error);
            throw new Error('Could not end interview. Please try again.');
        }
    }

    /**
     * Send a chat message to the AI
     * @param sessionId - Current session ID
     * @param message - Message text
     * @param code - Optional code context
     * @returns AI response and updated session
     */
    async sendChatMessage(
        sessionId: string,
        message: string,
        code?: string
    ): Promise<{ response: string; session: InterviewSession }> {
        try {
            return await sessionApi.sendChatMessage(sessionId, message, code);
        } catch (error) {
            console.error('Failed to send chat message:', error);
            throw new Error('Could not send message. Please try again.');
        }
    }

    /**
     * Update session state (non-critical operation)
     * @param sessionId - Session ID
     * @param state - State data to update
     */
    async updateSessionState(sessionId: string, state: any): Promise<void> {
        try {
            await sessionApi.updateState(sessionId, state);
        } catch (error) {
            console.error('Failed to update session state:', error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Load session from localStorage
     * @returns Saved session or null
     */
    loadSessionFromStorage(): InterviewSession | null {
        return storageService.load<InterviewSession>(this.STORAGE_KEY);
    }

    /**
     * Clear current session from storage
     */
    clearSessionFromStorage(): void {
        storageService.remove(this.STORAGE_KEY);
    }

    /**
     * Check if there's a saved session
     */
    hasSavedSession(): boolean {
        return storageService.has(this.STORAGE_KEY);
    }
}

// Export singleton instance
export const interviewService = new InterviewService();
