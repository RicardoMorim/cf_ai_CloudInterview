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
      console.log("DO: Loading session data...");
      await this.loadSession();
      console.log("DO: Session data loaded");
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
      sessionId: this.state.id.toString(),
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

    await this.saveSession();
    return this.session;
  }

  async getCurrentQuestion(): Promise<InterviewQuestion | null> {
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
}
