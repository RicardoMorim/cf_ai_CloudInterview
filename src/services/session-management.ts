import { InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, InterviewMode, InterviewStatus, Difficulty, QuestionType } from "../types";
import { QuestionSelector } from "./questions/questionSelector";
import { SessionActions } from "./session/sessionActions";

interface Env {
  SESSION_NAMESPACE: DurableObjectNamespace;
  KV: KVNamespace;
  AI: any;
}

/**
 * Interview Session Durable Object
 * Handles session lifecycle and state persistence
 */
export class InterviewSessionDO {
  private state: DurableObjectState;
  private env: Env;
  private session: InterviewSession | null = null;
  private timerId: NodeJS.Timeout | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;


    // Load session data on initialization
    this.state.blockConcurrencyWhile(async () => {
      console.log("DO Constructor: ID =", this.state.id.toString());
      console.log("DO: Loading session data...");
      await this.loadSession();
      console.log("DO: Session data loaded, session exists?", !!this.session);
    });

    // Set up automatic cleanup for expired sessions
    this.setupSessionCleanup();
  }

  // ==================
  // LIFECYCLE METHODS
  // ==================

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

  // ==================
  // SESSION OPERATIONS
  // ==================

  async startSession(
    sessionId: string,
    userId: string,
    mode: InterviewMode,
    jobType: string,
    difficulty: Difficulty = Difficulty.MEDIUM,
    estimatedDuration: number = 45,
    jobTitle?: string,
    jobDescription?: string,
    seniority?: string
  ): Promise<InterviewSession> {
    if (this.session && this.session.status === InterviewStatus.IN_PROGRESS) {
      throw new Error("Session already in progress");
    }

    const now = new Date().toISOString();

    // Use QuestionSelector service for question selection
    const questionSelector = new QuestionSelector(this.env);

    let selectedQuestions: InterviewQuestion[] = [];
    if (mode === InterviewMode.TECHNICAL) {
      selectedQuestions = await questionSelector.selectTechnicalQuestions(
        jobType,
        difficulty,
        jobTitle,
        jobDescription,
        seniority,
        this.state.storage
      );
    } else if (mode === InterviewMode.BEHAVIORAL) {
      selectedQuestions = await questionSelector.selectBehavioralQuestions(
        jobType,
        difficulty,
        jobTitle,
        jobDescription,
        seniority
      );
    }

    this.session = {
      sessionId: sessionId, // Use the provided sessionId, not the hashed DO ID
      userId,
      mode,
      jobType,
      difficulty,
      jobDescription,
      seniority: seniority as any,
      status: InterviewStatus.IN_PROGRESS,
      createdAt: now,
      startedAt: now,
      completedAt: null,
      duration: 0,
      currentQuestionIndex: 0,
      questions: selectedQuestions,
      answers: [],
      aiResponses: [],
      feedback: undefined,
      codingChallenge: undefined,
      codeSubmissions: [],
      scenarioContext: undefined
    };

    console.log("DO startSession: Saving session with ID:", this.session.sessionId);
    await this.saveSession();
    console.log("DO startSession: Session saved successfully");
    return this.session;
  }

  async getCurrentQuestion(): Promise<InterviewQuestion | null> {
    console.log("DO getCurrentQuestion: session exists?", !!this.session);
    if (!this.session) {
      throw new Error("No session found");
    }

    if (this.session.currentQuestionIndex >= this.session.questions.length) {
      return null;
    }

    return this.session.questions[this.session.currentQuestionIndex];
  }

  async submitAnswer(answer: InterviewAnswer): Promise<{
    session: InterviewSession;
    answer: InterviewAnswer;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const result = await SessionActions.submitAnswer(this.session, answer);
    await this.saveSession();
    return result;
  }

  async nextQuestion(): Promise<{
    question: InterviewQuestion | null;
    session: InterviewSession;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const result = await SessionActions.nextQuestion(this.session);
    await this.saveSession();
    return result;
  }

  async completeSession(): Promise<InterviewSession> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session = await SessionActions.completeSession(this.session, this.env.AI);
    await this.saveSession();
    return this.session;
  }

  async processChatMessage(userMessage: string): Promise<{
    response: string;
    session: InterviewSession;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const result = await SessionActions.processChatMessage(this.session, userMessage, this.env.AI);
    await this.saveSession();
    return result;
  }

  async getTranscript(): Promise<{
    session: InterviewSession;
    transcript: Array<any>;
  }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const transcript = SessionActions.buildTranscript(this.session);
    return { session: this.session, transcript };
  }

  async addAIResponse(response: AIResponse): Promise<void> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.aiResponses.push(response);
    await this.saveSession();
  }

  async addQuestions(questions: InterviewQuestion[]): Promise<void> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.questions = questions;
    await this.saveSession();
  }

  async addFeedback(feedback: any): Promise<void> {
    if (!this.session) {
      throw new Error("No session found");
    }

    this.session.feedback = feedback;
    await this.saveSession();
  }

  async getSession(): Promise<InterviewSession | null> {
    return this.session;
  }

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

  // ==================
  // HTTP HANDLER
  // ==================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Handle different endpoints
      if (path === "/start" && request.method === "POST") {
        console.log("DO /start: DO ID =", this.state.id.toString());
        const body = await request.json() as any;
        const session = await this.startSession(
          body.sessionId, // Pass the sessionId from the request
          body.userId,
          body.mode,
          body.jobType,
          body.difficulty,
          body.duration,
          body.jobTitle,
          body.jobDescription,
          body.seniority
        );
        console.log("DO /start: Returning session with ID:", session.sessionId);
        return new Response(JSON.stringify({ success: true, session }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/question/current" && request.method === "GET") {
        const question = await this.getCurrentQuestion();
        return new Response(JSON.stringify({ success: true, question }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/answer" && request.method === "POST") {
        const body = await request.json() as any;
        const result = await this.submitAnswer(body);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/question/next" && request.method === "GET") {
        const result = await this.nextQuestion();
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/end" && request.method === "POST") {
        const session = await this.completeSession();
        return new Response(JSON.stringify({ success: true, session }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/chat" && request.method === "POST") {
        const body = await request.json() as any;
        const result = await this.processChatMessage(body.message);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/state" && request.method === "GET") {
        const session = await this.getSession();
        return new Response(JSON.stringify({ success: true, session }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/update-state" && request.method === "POST") {
        const body = await request.json() as any;

        if (!this.session) {
          return new Response(JSON.stringify({ success: false, error: "No session found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Update currentCode if provided
        if (body.currentCode !== undefined) {
          (this.session as any).currentCode = body.currentCode;
        }

        // Update any other state fields as needed
        if (body.state) {
          Object.assign(this.session, body.state);
        }

        await this.saveSession();

        return new Response(JSON.stringify({ success: true, session: this.session }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/transcript" && request.method === "GET") {
        const result = await this.getTranscript();
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Unknown endpoint
      return new Response(JSON.stringify({ success: false, error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("DO fetch error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}
