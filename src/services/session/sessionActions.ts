/**
 * Session Actions
 * Business logic for interview session operations
 */

import { InterviewSession, InterviewAnswer, AIResponse, InterviewStatus, QuestionType, Sentiment, AIResponseType } from "../../types";

export class SessionActions {
    /**
     * Submit an answer to the current question
     */
    static async submitAnswer(
        session: InterviewSession,
        answer: InterviewAnswer
    ): Promise<{ session: InterviewSession; answer: InterviewAnswer }> {
        if (session.status !== InterviewStatus.IN_PROGRESS) {
            throw new Error("Session not in progress");
        }

        // Add the answer to the session
        session.answers.push(answer);

        // Update session duration
        if (session.startedAt) {
            const now = new Date();
            const start = new Date(session.startedAt);
            session.duration = Math.floor((now.getTime() - start.getTime()) / 1000);
        }

        return { session, answer };
    }

    /**
     * Move to the next question
     */
    static async nextQuestion(
        session: InterviewSession
    ): Promise<{ question: any; session: InterviewSession }> {
        session.currentQuestionIndex++;

        const question = session.currentQuestionIndex >= session.questions.length
            ? null
            : session.questions[session.currentQuestionIndex];

        return { question, session };
    }

    /**
     * Generate final feedback for completed session
     */
    static async generateFinalFeedback(
        session: InterviewSession,
        AI: any
    ): Promise<any> {
        const summaryPrompt = `
Generate a final interview summary for the candidate based on these answers:
${JSON.stringify(session.answers.map((a: any) => ({ q: a.questionId, a: a.answerText, score: a.evaluation?.score })))}

Return JSON:
- overallScore: 0-100
- summary: Executive summary of performance.
- strengths: List of strings.
- improvementAreas: List of strings.
- specificRecommendations: List of strings (actionable advice).
- recommendation: "Hire", "No Hire", "Strong Hire", "Leaning No Hire".
`;

        const aiResponse: any = await AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [{ role: "user", content: summaryPrompt }],
            temperature: 0.4,
            max_tokens: 1500
        });

        let responseText = "";
        if (aiResponse && aiResponse.response) {
            responseText = aiResponse.response;
        }

        const cleanResponse = responseText.replace(/```json|```/g, '').trim();

        try {
            const feedbackData = JSON.parse(cleanResponse);
            return {
                feedbackId: `fb_${Date.now()}`,
                sessionId: session.sessionId,
                overallScore: feedbackData.overallScore || 0,
                summary: feedbackData.summary || "No summary generated.",
                strengths: feedbackData.strengths || [],
                improvementAreas: feedbackData.improvementAreas || [],
                specificRecommendations: feedbackData.specificRecommendations || [],
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                feedbackId: `fb_${Date.now()}`,
                sessionId: session.sessionId,
                overallScore: 0,
                summary: "Session completed. Unable to generate detailed feedback.",
                strengths: [],
                improvementAreas: [],
                specificRecommendations: [],
                generatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Complete the interview session
     */
    static async completeSession(
        session: InterviewSession,
        AI: any
    ): Promise<InterviewSession> {
        session.status = InterviewStatus.COMPLETED;
        session.completedAt = new Date().toISOString();

        // Update duration
        if (session.startedAt) {
            const now = new Date();
            const start = new Date(session.startedAt);
            session.duration = Math.floor((now.getTime() - start.getTime()) / 1000);
        }

        // Generate final feedback if not present
        if (!session.feedback) {
            session.feedback = await SessionActions.generateFinalFeedback(session, AI);
        }

        return session;
    }

    /**
     * Process chat message
     */
    static async processChatMessage(
        session: InterviewSession,
        userMessage: string,
        AI: any
    ): Promise<{ response: string; session: InterviewSession }> {
        const conversationHistory = session.aiResponses.slice(-5);

        // Build comprehensive context including code submissions
        let contextDetails = `
You are a friendly AI interview assistant helping a candidate review their completed interview.

Interview Details:
- Job Type: ${session.jobType}
- Interview Mode: ${session.mode}
- Status: ${session.status}
- Overall Score: ${session.feedback?.overallScore || 'Not yet scored'}

Questions & Answers:
`;

        // Add each question, answer, and submitted code
        session.questions.forEach((q, idx) => {
            const answer = session.answers.find(a => a.questionId === q.questionId);
            contextDetails += `\n${idx + 1}. ${q.title}\n`;
            contextDetails += `   Type: ${q.type}\n`;

            if (answer) {
                if (answer.codeSubmission) {
                    contextDetails += `   Submitted Code:\n\n${answer.codeSubmission}\n`;
                }
                if (answer.answerText) {
                    contextDetails += `   Answer: ${answer.answerText}\n`;
                }
            } else {
                contextDetails += `   (Not answered)\n`;
            }
        });

        // Add feedback if available
        if (session.feedback) {
            contextDetails += `\n\nFeedback Summary:\n`;
            contextDetails += `- ${session.feedback.summary}\n`;
            if (session.feedback.strengths?.length) {
                contextDetails += `\nStrengths: ${session.feedback.strengths.join(', ')}\n`;
            }
            if (session.feedback.improvementAreas?.length) {
                contextDetails += `\nAreas for Improvement: ${session.feedback.improvementAreas.join(', ')}\n`;
            }
        }

        const chatPrompt = `${contextDetails}

Recent conversation:
${conversationHistory.map(r => `AI: ${r.content}`).join('\n')}

User message: ${userMessage}

Provide a helpful, specific response referencing the code and answers above when relevant. Be encouraging but honest about areas for improvement. Keep it concise and professional.
`;

        const aiResponse: any = await AI.run("@cf/meta/llama-3.3-70b-instruc t-fp8-fast", {
            messages: [{ role: "user", content: chatPrompt }],
            temperature: 0.7,
            max_tokens: 500
        });

        let aiResponseText = "";
        if (aiResponse && aiResponse.response) {
            aiResponseText = aiResponse.response;
        }

        // Store AI response
        session.aiResponses.push({
            responseId: `chat_${Date.now()}`,
            sessionId: session.sessionId,
            questionId: "chat",
            type: AIResponseType.ENCOURAGEMENT,
            content: aiResponseText,
            generatedAt: new Date().toISOString(),
            sentiment: Sentiment.NEUTRAL,
            followUp: false,
            responseTime: 0,
            confidence: 1
        });

        return {
            response: aiResponseText,
            session
        };
    }

    /**
     * Build transcript of the interview
     */
    static buildTranscript(session: InterviewSession): Array<{
        type: "question" | "answer" | "ai_response";
        content: string;
        timestamp: string;
        metadata?: any;
    }> {
        const transcript: Array<{
            type: "question" | "answer" | "ai_response";
            content: string;
            timestamp: string;
            metadata?: any;
        }> = [];

        // Add questions and answers
        for (let i = 0; i < session.questions.length; i++) {
            const question = session.questions[i];
            const answer = session.answers.find(a => a.questionId === question.questionId);

            transcript.push({
                type: "question",
                content: question.text,
                timestamp: new Date(question.questionId).toISOString(),
                metadata: { questionType: question.type, difficulty: question.difficulty }
            });

            if (answer) {
                transcript.push({
                    type: "answer",
                    content: answer.answerText,
                    timestamp: answer.submittedAt,
                    metadata: {
                        responseTime: answer.responseTime,
                        scores: {
                            completeness: answer.completenessScore,
                            relevance: answer.relevanceScore,
                            communication: answer.communicationScore
                        }
                    }
                });
            }
        }

        // Add AI responses
        session.aiResponses.forEach(response => {
            transcript.push({
                type: "ai_response",
                content: response.content,
                timestamp: response.generatedAt,
                metadata: {
                    responseType: response.type,
                    sentiment: response.sentiment
                }
            });
        });

        // Sort by timestamp
        transcript.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return transcript;
    }
}
