// Interview Session Management Service using Durable Objects

import { InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, InterviewMode, InterviewStatus, Difficulty, QuestionType, Sentiment, AIResponseType } from "../types";
import { InterviewSessionRepository } from "./interfaces";

interface Env {
  SESSION_NAMESPACE: DurableObjectNamespace;
  KV: KVNamespace;
  AI: any;
}

export class InterviewSessionDO {
  private state: DurableObjectState;
  private env: Env;
  private session: InterviewSession | null = null;
  private timerId: NodeJS.Timeout | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Wait for the state to be ready
    this.state.blockConcurrencyWhile(async () => {
      console.log("DO: Loading session data...");
      await this.loadSession();
      console.log("DO: Session data loaded");
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

    // Select questions based on mode
    let selectedQuestions: InterviewQuestion[] = [];

    if (mode === InterviewMode.TECHNICAL) {
      try {
        // 1. Fetch essentials list from KV
        const essentialsData = await this.state.storage.get<any>("essentials") || // Try local storage first (caching)
          await this.env.KV.get("essentials", { type: "json" });

        if (essentialsData && essentialsData.problems) {
          // 2. Filter problems
          const candidates = essentialsData.problems.filter((p: any) => {
            return p.difficulty && p.difficulty.toLowerCase() === difficulty.toLowerCase();
          });

          const pool = candidates.length > 0 ? candidates : essentialsData.problems;
          const limitedPool = pool.slice(0, 50);

          // 3. Ask AI to select a question
          let selectedId = 0;
          try {
            const prompt = `
You are an expert technical interviewer. 
Job Role: ${jobType}
Difficulty: ${difficulty}
Task: Select the most suitable coding problem from the list below for this interview.
Rules:
- Return ONLY the ID of the selected problem.
- If no problem is suitable or you prefer to ask theoretical questions generated on the fly, return 0.
- Do not add any explanation or text, just the number.

Problems:
${limitedPool.map((p: any) => `${p.id}: ${p.title} (${p.topics.join(', ')})`).join('\n')}
`;
            const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
              messages: [{ role: "user", content: prompt }]
            });

            const responseText = response.response.trim();
            const parsedId = parseInt(responseText.match(/\d+/)?.[0] || "0");
            selectedId = isNaN(parsedId) ? 0 : parsedId;
            console.log(`DO: AI selected question ID: ${selectedId}`);

          } catch (aiError) {
            console.error("DO: AI selection failed, falling back to random:", aiError);
            if (pool.length > 0) {
              selectedId = pool[Math.floor(Math.random() * pool.length)].id;
            }
          }

          if (selectedId > 0) {
            // 4. Fetch full details
            const fullProblem = await this.env.KV.get(`problem:${selectedId}`, { type: "json" }) as any;

            if (fullProblem) {
              selectedQuestions.push({
                questionId: fullProblem.id.toString(),
                type: QuestionType.CODING,
                category: fullProblem.metadata?.category || "General",
                difficulty: fullProblem.difficulty as Difficulty,
                title: fullProblem.title,
                text: fullProblem.description,
                tags: fullProblem.metadata?.topics || [],
                estimatedTime: 20,
                followUpQuestions: [],
                hints: fullProblem.metadata?.hints || [],
                metadata: {
                  difficultyWeight: 1,
                  popularity: fullProblem.metadata?.likes || 0,
                  lastUpdated: new Date().toISOString(),
                  relatedQuestions: []
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("DO: Error fetching questions from KV:", error);
      }
    } else if (mode === InterviewMode.BEHAVIORAL) {
      // Behavioral questions generated on the fly
    }

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
          sentiment: response.sentiment
        }
      });
    });

    // Sort by timestamp
    transcript.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      session: this.session,
      transcript
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    console.log(`DO: Handling fetch request for path: ${path}`);

    try {
      switch (path) {
        case "/start":
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const { userId, mode, jobType, difficulty, estimatedDuration, sessionId } = await request.json() as any;
          await this.startSession(userId, mode, jobType, difficulty, estimatedDuration);
          if (sessionId) {
             this.session!.sessionId = sessionId;
             await this.saveSession();
          }
          return new Response(JSON.stringify({ success: true, session: this.session }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/begin":
           if (request.method !== "POST") {
             return new Response("Method Not Allowed", { status: 405 });
           }
           const firstQuestion = await this.getCurrentQuestion();
           return new Response(JSON.stringify({ success: true, question: firstQuestion, session: this.session }), {
             headers: { "Content-Type": "application/json" }
           });

        case "/answer":
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const answer = await request.json() as any;
          const result = await this.submitAnswer(answer);
          return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/next":
           if (request.method !== "POST") {
             return new Response("Method Not Allowed", { status: 405 });
           }
           const nextResult = await this.nextQuestion();
           return new Response(JSON.stringify({ success: true, ...nextResult }), {
             headers: { "Content-Type": "application/json" }
           });

        case "/complete":
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const completedSession = await this.completeSession();
          return new Response(JSON.stringify({ success: true, session: completedSession }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/transcript":
           const transcriptData = await this.getTranscript();
           return new Response(JSON.stringify({ success: true, ...transcriptData }), {
             headers: { "Content-Type": "application/json" }
           });
           
        case "/summary":
           const summaryData = await this.getTranscript();
           return new Response(JSON.stringify(summaryData), {
             headers: { "Content-Type": "application/json" }
           });

        case "/state":
           if (!this.session) {
             return new Response(JSON.stringify({ success: false, error: "No session found" }), { status: 404, headers: { "Content-Type": "application/json" } });
           }
           return new Response(JSON.stringify({ success: true, session: this.session }), {
             headers: { "Content-Type": "application/json" }
           });

        case "/update-state":
           if (request.method !== "POST") {
             return new Response("Method Not Allowed", { status: 405 });
           }
           const { session: updatedSession } = await request.json() as any;
           if (updatedSession) {
             this.session = updatedSession;
             await this.saveSession();
           }
           return new Response(JSON.stringify({ success: true, session: this.session }), {
             headers: { "Content-Type": "application/json" }
           });

        case "/question/current":
           const currentQ = await this.getCurrentQuestion();
           return new Response(JSON.stringify({ success: true, question: currentQ, session: this.session }), {
             headers: { "Content-Type": "application/json" }
           });

        case "/add-interaction":
           if (request.method !== "POST") {
             return new Response("Method Not Allowed", { status: 405 });
           }
           const { userText, aiText } = await request.json() as any;
           
           // Store AI response
           if (aiText && this.session) {
             this.session.aiResponses.push({
               responseId: crypto.randomUUID(),
               sessionId: this.session.sessionId,
               type: AIResponseType.ENCOURAGEMENT, // Defaulting to encouragement/chat
               content: aiText,
               generatedAt: new Date().toISOString(),
               sentiment: Sentiment.NEUTRAL,
               followUp: false,
               responseTime: 0,
               confidence: 1
             });
             await this.saveSession();
           }
           
           return new Response(JSON.stringify({ success: true }), {
             headers: { "Content-Type": "application/json" }
           });

        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("DO: Error handling request:", error);
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

    // Use /start endpoint
    const response = await stub.fetch("http://internal/start", {
      method: "POST",
      body: JSON.stringify({
        userId,
        mode,
        jobType,
        difficulty,
        estimatedDuration,
        sessionId // Add sessionId to the data
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
    const response = await stub.fetch("http://internal/summary");

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