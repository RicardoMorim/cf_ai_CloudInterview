// Interview Session Management Service using Durable Objects

import { InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, InterviewMode, InterviewStatus, Difficulty } from "../types";
import { InterviewSessionRepository } from "./interfaces";

export class InterviewSessionDO {
  private state: DurableObjectState;
  private session: InterviewSession | null = null;
  private timerId: NodeJS.Timeout | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    
    // Wait for the state to be ready
    this.state.blockConcurrencyWhile(async () => {
      await this.loadSession();
    });

    // Set up automatic cleanup for expired sessions
    this.setupSessionCleanup();
  }

  private async loadSession(): Promise<void> {
    const sessionData = await this.state.storage.get<InterviewSession>("session");
    if (sessionData) {
      this.session = sessionData;
    }
  }

  private async saveSession(): Promise<void> {
    if (this.session) {
      await this.state.storage.put("session", this.session);
    }
  }

  private setupSessionCleanup(): void {
    // Check session expiration every 5 minutes
    this.timerId = setInterval(async () => {
      if (this.session && this.session.status === InterviewStatus.IN_PROGRESS) {
        const now = new Date();
        const sessionStart = new Date(this.session.startedAt || this.session.createdAt);
        const sessionDuration = (now.getTime() - sessionStart.getTime()) / (1000 * 60); // minutes

        // Auto-complete session if it exceeds maximum duration (2 hours)
        if (sessionDuration > 120) {
          await this.completeSession();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Start a new interview session
  async startSession(
    userId: string,
    mode: InterviewMode,
    jobType: string,
    difficulty: Difficulty = Difficulty.MEDIUM,
    estimatedDuration: number = 45
  ): Promise<InterviewSession> {
    if (this.session && this.session.status === InterviewStatus.IN_PROGRESS) {
      throw new Error("Session already in progress");
    }

    const now = new Date().toISOString();
    this.session = {
      sessionId: this.state.id.toString(),
      userId,
      mode,
      jobType,
      difficulty,
      status: InterviewStatus.PENDING,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      duration: 0,
      currentQuestionIndex: 0,
      questions: [],
      answers: [],
      aiResponses: [],
      feedback: undefined,
      codingChallenge: undefined,
      codeSubmissions: [],
      scenarioContext: undefined
    };

    await this.saveSession();
    return this.session;
  }

  // Begin the interview
  async beginSession(): Promise<InterviewSession> {
    if (!this.session) {
      throw new Error("No session found");
    }

    if (this.session.status !== InterviewStatus.PENDING) {
      throw new Error("Session already started");
    }

    this.session.status = InterviewStatus.IN_PROGRESS;
    this.session.startedAt = new Date().toISOString();
    
    await this.saveSession();
    return this.session;
  }

  // Add questions to the session
  async addQuestions(questions: InterviewQuestion[]): Promise<void> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.questions = questions;
    await this.saveSession();
  }

  // Get the current question
  async getCurrentQuestion(): Promise<InterviewQuestion | null> {
    if (!this.session) {
      throw new Error("No session found");
    }

    if (this.session.currentQuestionIndex >= this.session.questions.length) {
      return null;
    }

    return this.session.questions[this.session.currentQuestionIndex];
  }

  // Submit an answer
  async submitAnswer(answer: InterviewAnswer): Promise<{
    session: InterviewSession;
    answer: InterviewAnswer;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    if (this.session.status !== InterviewStatus.IN_PROGRESS) {
      throw new Error("Session not in progress");
    }

    // Add the answer to the session
    this.session.answers.push(answer);
    
    // Update session duration
    if (this.session.startedAt) {
      const now = new Date();
      const start = new Date(this.session.startedAt);
      this.session.duration = Math.floor((now.getTime() - start.getTime()) / 1000);
    }

    await this.saveSession();

    return {
      session: this.session,
      answer
    };
  }

  // Add AI response
  async addAIResponse(response: AIResponse): Promise<void> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.aiResponses.push(response);
    await this.saveSession();
  }

  // Move to next question
  async nextQuestion(): Promise<{
    question: InterviewQuestion | null;
    session: InterviewSession;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.currentQuestionIndex++;
    await this.saveSession();

    const question = await this.getCurrentQuestion();
    return {
      question,
      session: this.session
    };
  }

  // Complete the session
  async completeSession(): Promise<InterviewSession> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.status = InterviewStatus.COMPLETED;
    this.session.completedAt = new Date().toISOString();
    
    // Update duration
    if (this.session.startedAt) {
      const now = new Date();
      const start = new Date(this.session.startedAt);
      this.session.duration = Math.floor((now.getTime() - start.getTime()) / 1000);
    }

    await this.saveSession();
    
    // Clean up timer
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    return this.session;
  }

  // Cancel the session
  async cancelSession(): Promise<InterviewSession> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.status = InterviewStatus.CANCELLED;
    this.session.completedAt = new Date().toISOString();
    
    await this.saveSession();
    
    // Clean up timer
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    return this.session;
  }

  // Add feedback to the session
  async addFeedback(feedback: any): Promise<void> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.feedback = feedback;
    await this.saveSession();
  }

  // Get session transcript
  async getTranscript(): Promise<{
    session: InterviewSession;
    transcript: Array<{
      type: "question" | "answer" | "ai_response";
      content: string;
      timestamp: string;
      metadata?: any;
    }>;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const transcript: Array<{
      type: "question" | "answer" | "ai_response";
      content: string;
      timestamp: string;
      metadata?: any;
    }> = [];

    // Add questions and answers
    for (let i = 0; i < this.session.questions.length; i++) {
      const question = this.session.questions[i];
      const answer = this.session.answers.find(a => a.questionId === question.questionId);
      
      transcript.push({
        type: "question",
        content: question.text,
        timestamp: new Date(question.questionId).toISOString(), // This would need proper timestamping
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
    this.session.aiResponses.forEach(response => {
      transcript.push({
        type: "ai_response",
        content: response.content,
        timestamp: response.generatedAt,
        metadata: {
          responseType: response.type,
          sentiment: response.sentiment,
          followUp: response.followUp
        }
      });
    });

    return {
      session: this.session,
      transcript
    };
  }

  // Get session summary
  async getSessionSummary(): Promise<{
    session: InterviewSession;
    statistics: {
      totalQuestions: number;
      answeredQuestions: number;
      averageResponseTime: number;
      estimatedCompletionTime: number;
    };
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const totalQuestions = this.session.questions.length;
    const answeredQuestions = this.session.answers.length;
    const averageResponseTime = answeredQuestions > 0 
      ? this.session.answers.reduce((sum, answer) => sum + answer.responseTime, 0) / answeredQuestions
      : 0;

    // Estimate completion time based on answered questions vs total questions
    const estimatedCompletionTime = totalQuestions > 0 
      ? (this.session.duration / answeredQuestions) * totalQuestions
      : 0;

    return {
      session: this.session,
      statistics: {
        totalQuestions,
        answeredQuestions,
        averageResponseTime,
        estimatedCompletionTime
      }
    };
  }

  // Clean up expired session data
  async cleanup(): Promise<void> {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.session) {
      const now = new Date();
      const created = new Date(this.session.createdAt);
      const ageInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

      // Delete sessions older than 24 hours
      if (ageInHours > 24) {
        await this.state.storage.deleteAll();
        this.session = null;
      }
    }
  }

  // HTTP handler for external API calls
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case "/start":
          const startData = await request.json() as {
            userId: string;
            mode: InterviewMode;
            jobType: string;
            difficulty?: Difficulty;
            estimatedDuration?: number;
          };
          
          const session = await this.startSession(
            startData.userId,
            startData.mode,
            startData.jobType,
            startData.difficulty,
            startData.estimatedDuration
          );
          
          return new Response(JSON.stringify({ success: true, session }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/begin":
          const startedSession = await this.beginSession();
          return new Response(JSON.stringify({ success: true, session: startedSession }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/question/current":
          const currentQuestion = await this.getCurrentQuestion();
          return new Response(JSON.stringify({ 
            success: true, 
            question: currentQuestion,
            hasMore: currentQuestion !== null
          }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/answer":
          if (request.method === "POST") {
            const answerData = await request.json() as InterviewAnswer;
            const result = await this.submitAnswer(answerData);
            return new Response(JSON.stringify({ success: true, ...result }), {
              headers: { "Content-Type": "application/json" }
            });
          }
          break;

        case "/question/next":
          const nextResult = await this.nextQuestion();
          return new Response(JSON.stringify({ success: true, ...nextResult }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/complete":
          const completedSession = await this.completeSession();
          return new Response(JSON.stringify({ success: true, session: completedSession }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/cancel":
          const cancelledSession = await this.cancelSession();
          return new Response(JSON.stringify({ success: true, session: cancelledSession }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/transcript":
          const transcript = await this.getTranscript();
          return new Response(JSON.stringify({ success: true, ...transcript }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/summary":
          const summary = await this.getSessionSummary();
          return new Response(JSON.stringify({ success: true, ...summary }), {
            headers: { "Content-Type": "application/json" }
          });

        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString()
        } 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}

// Session Manager for creating and managing Durable Object instances
export class SessionManager {
  private sessionNamespace: DurableObjectNamespace;

  constructor(sessionNamespace: DurableObjectNamespace) {
    this.sessionNamespace = sessionNamespace;
  }

  // Create a new session
  async createSession(
    userId: string,
    mode: InterviewMode,
    jobType: string,
    difficulty?: Difficulty,
    estimatedDuration?: number
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const stub = this.sessionNamespace.get(this.sessionNamespace.idFromName(sessionId));
    
    const response = await stub.fetch("/start", {
      method: "POST",
      body: JSON.stringify({
        userId,
        mode,
        jobType,
        difficulty,
        estimatedDuration
      }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    return sessionId;
  }

  // Get session stub
  getSessionStub(sessionId: string): DurableObjectStub {
    return this.sessionNamespace.get(this.sessionNamespace.idFromName(sessionId));
  }

  // Get session summary
  async getSessionSummary(sessionId: string): Promise<any> {
    const stub = this.getSessionStub(sessionId);
    const response = await stub.fetch("/summary");
    
    if (!response.ok) {
      throw new Error("Failed to get session summary");
    }

    return response.json();
  }

  // Clean up old sessions
  async cleanupOldSessions(): Promise<void> {
    // This would need to be implemented based on how you track active sessions
    // For now, it's a placeholder for future implementation
  }
}