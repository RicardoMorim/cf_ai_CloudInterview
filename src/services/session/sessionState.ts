import { InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, InterviewStatus } from "../../types";

/**
 * Session State Manager
 * Handles all state update operations for interview sessions
 */
export class SessionStateManager {
    /**
     * Update session status
     */
    updateStatus(session: InterviewSession, status: InterviewStatus): void {
        session.status = status;

        if (status === InterviewStatus.IN_PROGRESS && !session.startedAt) {
            session.startedAt = new Date().toISOString();
        } else if (status === InterviewStatus.COMPLETED && !session.completedAt) {
            session.completedAt = new Date().toISOString();
        }
    }

    /**
     * Update session duration
     */
    updateDuration(session: InterviewSession): void {
        if (session.startedAt) {
            const now = new Date();
            const start = new Date(session.startedAt);
            session.duration = Math.floor((now.getTime() - start.getTime()) / 1000);
        }
    }

    /**
     * Add question to session
     */
    addQuestion(session: InterviewSession, question: InterviewQuestion): void {
        session.questions.push(question);
    }

    /**
     * Add questions to session
     */
    addQuestions(session: InterviewSession, questions: InterviewQuestion[]): void {
        session.questions = questions;
    }

    /**
     * Add answer to session
     */
    addAnswer(session: InterviewSession, answer: InterviewAnswer): void {
        session.answers.push(answer);
        this.updateDuration(session);
    }

    /**
     * Add AI response to session
     */
    addAIResponse(session: InterviewSession, response: AIResponse): void {
        session.aiResponses.push(response);
    }

    /**
     * Move to next question
     */
    moveToNextQuestion(session: InterviewSession): void {
        session.currentQuestionIndex++;
    }

    /**
     * Get current question
     */
    getCurrentQuestion(session: InterviewSession): InterviewQuestion | null {
        if (session.currentQuestionIndex >= session.questions.length) {
            return null;
        }
        return session.questions[session.currentQuestionIndex];
    }

    /**
     * Check if interview is complete (all questions answered)
     */
    isInterviewComplete(session: InterviewSession): boolean {
        return session.currentQuestionIndex >= session.questions.length;
    }

    /**
     * Set feedback
     */
    setFeedback(session: InterviewSession, feedback: any): void {
        session.feedback = feedback;
    }

    /**
     * Calculate progress percentage
     */
    calculateProgress(session: InterviewSession): number {
        if (session.questions.length === 0) return 0;
        return Math.floor((session.currentQuestionIndex / session.questions.length) * 100);
    }
}

export const sessionStateManager = new SessionStateManager();
