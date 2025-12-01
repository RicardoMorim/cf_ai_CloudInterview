// Interview Session Management Service using Durable Objects

import { InterviewSession, InterviewQuestion, InterviewAnswer, AIResponse, InterviewMode, InterviewStatus, Difficulty, QuestionType, Sentiment, AIResponseType, ExperienceLevel, Essentials } from "../types";
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
    estimatedDuration: number = 45,
    jobTitle?: string,
    jobDescription?: string,
    seniority?: string
  ): Promise<InterviewSession> {
    if (this.session && this.session.status === InterviewStatus.IN_PROGRESS) {
      throw new Error("Session already in progress");
    }

    const now = new Date().toISOString();
    let selectedQuestions: InterviewQuestion[] = [];

    if (mode === InterviewMode.TECHNICAL) {
      try {
        // 1. Fetch essentials list from KV
        const keys = await this.env.KV.list();
        console.log('Available keys:', keys);

        console.log('Data:', await this.env.KV.get("essentials", { type: "json" }));
        var essentialsData: Essentials = await this.env.KV.get("essentials", { type: "json" });

        console.log("DO: KV essentials:", essentialsData);

        // Fallback to local data if KV is empty
        if (!essentialsData || !essentialsData.problems) {
          console.log("DO: KV essentials missing, using local fallback");
          const { TECHNICAL_QUESTIONS } = await import("../data/questions");
          essentialsData = {
            problems: TECHNICAL_QUESTIONS.map(q => ({
              questionId: q.questionId,
              title: q.title,
              difficulty: q.difficulty,
              topics: q.tags
            }))
          };

          // Also populate the full problem details in the fallback path
          for (const q of TECHNICAL_QUESTIONS) {
            await this.state.storage.put(`problem:${q.questionId}`, q);
          }
        }

        if (essentialsData && essentialsData.problems) {
          // 2. Filter problems
          const candidates = essentialsData.problems.filter((p: any) => {
            return p.difficulty && p.difficulty.toLowerCase() === difficulty.toLowerCase();
          });

          const pool = candidates.length > 0 ? candidates : essentialsData.problems;
          const limitedPool = pool.slice(0, 50);

          // 3. Ask AI to select a question
          let selectedId = "0";
          try {
            const prompt = `
You are an expert technical interviewer. 
Job Role: ${jobType}
${jobTitle ? `Job Title: ${jobTitle}` : ''}
${seniority ? `Seniority Level: ${seniority}` : ''}
Difficulty: ${difficulty}
${jobDescription ? `Job Description Context: ${jobDescription.substring(0, 300)}...` : ''}

Task: Select the most suitable coding problem from the list below for this interview.
Rules:
- Return ONLY the ID of the selected problem.
- If no problem is suitable or you prefer to ask theoretical questions generated on the fly, return 0.
- Do not add any explanation or text, just the ID.

Problems:
${limitedPool.map((p: any) => `${p.id}: ${p.title} (${p.topics.join(', ')})`).join('\n')}
`;
            const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
              messages: [{ role: "user", content: prompt }]
            });

            console.log("DO: AI Response:", JSON.stringify(response));

            let responseText = "0";
            if (response) {
              if (typeof response.response === 'string') {
                responseText = response.response.trim();
              } else if (typeof response.response === 'number') {
                responseText = response.response.toString();
              } else if (typeof response === 'string') {
                responseText = response.trim();
              } else if (response.result && typeof response.result.response === 'string') {
                responseText = response.result.response.trim();
              }
            }

            selectedId = responseText.replace(/['"]/g, '').trim();
            console.log(`DO: AI selected question ID: ${selectedId}`);

          } catch (aiError) {
            console.error("DO: AI selection failed, falling back to random:", aiError);
            if (pool.length > 0) {
              selectedId = pool[Math.floor(Math.random() * pool.length)].questionId;
            }
          }

          if (selectedId !== "0") {
            // 4. Fetch full details
            let fullProblem = await this.state.storage.get(`problem:${selectedId}`) as any;

            if (!fullProblem) {
              fullProblem = await this.env.KV.get(`problem:${selectedId}`, { type: "json" }) as any;
            }

            if (!fullProblem) {
              const { TECHNICAL_QUESTIONS } = await import("../data/questions");
              fullProblem = TECHNICAL_QUESTIONS.find(q => q.questionId === selectedId);
            }

            if (fullProblem) {
              const isAlreadyFormatted = fullProblem.questionId && fullProblem.text;

              if (isAlreadyFormatted) {
                selectedQuestions.push(fullProblem);
              } else {
                selectedQuestions.push({
                  questionId: fullProblem.questionId.toString(),
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
        }
      } catch (error) {
        console.error("DO: Error fetching questions:", error);
      }
    } else if (mode === InterviewMode.BEHAVIORAL) {
      try {
        const prompt = `
You are an expert behavioral interviewer.
Job Role: ${jobType}
${jobTitle ? `Job Title: ${jobTitle}` : ''}
${seniority ? `Seniority Level: ${seniority}` : ''}
${jobDescription ? `Job Description Context: ${jobDescription.substring(0, 500)}...` : ''}

Task: Generate a behavioral interview question tailored to this specific role and seniority.
The question should assess soft skills relevant to the position (e.g., leadership for seniors, learning for juniors).

Return ONLY the JSON object with this structure:
{
  "questionId": "gen_beh_${Date.now()}",
  "title": "Short Title",
  "text": "The full question text...",
  "difficulty": "${difficulty}",
  "tags": ["Tag1", "Tag2"],
  "hints": ["Hint 1", "Hint 2"]
}
`;
        const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
          messages: [{ role: "user", content: prompt }]
        });

        let responseText = "";
        if (response) {
          if (typeof response.response === 'string') {
            responseText = response.response;
          } else if (typeof response === 'string') {
            responseText = response;
          } else if (response.result && typeof response.result.response === 'string') {
            responseText = response.result.response;
          }
        }

        const cleanResponse = responseText.replace(/```json|```/g, '').trim();
        const questionData = JSON.parse(cleanResponse);

        selectedQuestions.push({
          questionId: questionData.questionId || `gen_beh_${Date.now()}`,
          type: QuestionType.BEHAVIORAL,
          category: "Behavioral",
          difficulty: difficulty,
          title: questionData.title || "Behavioral Question",
          text: questionData.text || "Tell me about a time you faced a challenge.",
          tags: questionData.tags || ["Behavioral"],
          estimatedTime: 15,
          followUpQuestions: [],
          hints: questionData.hints || [],
          metadata: {
            difficultyWeight: 1,
            popularity: 0,
            lastUpdated: new Date().toISOString(),
            relatedQuestions: []
          }
        });

      } catch (error) {
        console.error("DO: Failed to generate behavioral question, falling back to static:", error);
        const { BEHAVIORAL_SCENARIOS } = await import("../data/questions");
        if (BEHAVIORAL_SCENARIOS.length > 0) {
          selectedQuestions.push(BEHAVIORAL_SCENARIOS[0]);
        }
      }
    }

    this.session = {
      sessionId: this.state.id.toString(),
      userId,
      mode,
      jobType,
      difficulty,
      jobDescription,
      seniority: seniority as any,
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

    console.log(this.session.questions.length + " questions");
    console.log(this.session.currentQuestionIndex + " current question index");
    if (this.session.currentQuestionIndex >= this.session.questions.length) {
      return null;
    }

    console.log(this.session.questions[this.session.currentQuestionIndex]);

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

  // Complete the session and generate feedback
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

    // Generate Final Feedback if not already present
    if (!this.session.feedback) {
      try {
        const summaryPrompt = `
          Generate a final interview summary for the candidate based on these answers:
          ${JSON.stringify(this.session.answers.map((a: any) => ({ q: a.questionId, a: a.answerText, score: a.evaluation?.score })))}
          
          Return JSON:
          - overallScore: 0-100
          - summary: Executive summary of performance.
          - strengths: List of strings.
          - improvementAreas: List of strings.
          - specificRecommendations: List of strings (actionable advice).
          - recommendation: "Hire", "No Hire", "Strong Hire", "Leaning No Hire".
        `;

        const aiResponse = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.4,
          max_tokens: 1500
        });

        let responseText = "";
        if (aiResponse) {
          if (typeof aiResponse.response === 'string') {
            responseText = aiResponse.response;
          } else if (typeof aiResponse === 'string') {
            responseText = aiResponse;
          } else if (aiResponse.result && typeof aiResponse.result.response === 'string') {
            responseText = aiResponse.result.response;
          }
        }

        const cleanResponse = responseText.replace(/```json|```/g, '').trim();
        const feedbackData = JSON.parse(cleanResponse);

        this.session.feedback = {
          feedbackId: `fb_${Date.now()}`,
          sessionId: this.session.sessionId,
          overallScore: feedbackData.overallScore || 0,
          summary: feedbackData.summary || "No summary generated.",
          strengths: feedbackData.strengths || [],
          improvementAreas: feedbackData.improvementAreas || [],
          specificRecommendations: feedbackData.specificRecommendations || [],
          generatedAt: new Date().toISOString()
        };
      } catch (e) {
        console.error("DO: Failed to generate final feedback:", e);
        this.session.feedback = {
          feedbackId: `fb_err_${Date.now()}`,
          sessionId: this.session.sessionId,
          overallScore: 70,
          summary: "Interview completed. Feedback generation failed.",
          strengths: [],
          improvementAreas: [],
          specificRecommendations: [],
          generatedAt: new Date().toISOString()
        };
      }
    }

    await this.saveSession();

    // Clean up timer
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    return this.session;
  }

  // Handle post-interview chat
  async chat(message: string): Promise<{ response: string; session: InterviewSession }> {
    if (!this.session) {
      throw new Error("No session found");
    }

    const context = `
      You are a helpful AI assistant discussing the results of a technical interview with the candidate.
      
      Interview Context:
      Job: ${this.session.jobType}
      Difficulty: ${this.session.difficulty}
      Feedback: ${JSON.stringify(this.session.feedback)}
      
      Candidate's Question: ${message}
      
      Answer the candidate's question helpfully and encouragingly. refer to specific parts of their performance if possible.
    `;

    let aiResponseText = "";
    try {
      const aiResponse = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [{ role: "user", content: context }],
        temperature: 0.7,
        max_tokens: 800
      });

      if (aiResponse) {
        if (typeof aiResponse.response === 'string') {
          aiResponseText = aiResponse.response;
        } else if (typeof aiResponse === 'string') {
          aiResponseText = aiResponse;
        } else if (aiResponse.result && typeof aiResponse.result.response === 'string') {
          aiResponseText = aiResponse.result.response;
        }
      }
    } catch (e) {
      console.error("DO: Chat generation failed:", e);
      aiResponseText = "I'm sorry, I'm having trouble processing your request right now.";
    }

    // Store the interaction
    this.session.aiResponses.push({
      responseId: `chat_${Date.now()}`,
      sessionId: this.session.sessionId,
      questionId: "chat",
      type: AIResponseType.ENCOURAGEMENT, // Reusing this type for chat
      content: aiResponseText,
      generatedAt: new Date().toISOString(),
      sentiment: Sentiment.NEUTRAL,
      followUp: false,
      responseTime: 0,
      confidence: 1
    });

    await this.saveSession();

    return {
      response: aiResponseText,
      session: this.session
    };
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
          const { userId, mode, jobType, difficulty, estimatedDuration, sessionId, jobTitle, jobDescription, seniority } = await request.json() as any;
          await this.startSession(userId, mode, jobType, difficulty, estimatedDuration, jobTitle, jobDescription, seniority);
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

        case "/answer": {
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const answerData = await request.json() as any;

          if (!this.session) {
            return new Response(JSON.stringify({ success: false, error: "Session not found" }), { status: 404 });
          }

          const currentQ = this.session.questions[this.session.currentQuestionIndex];
          const answerId = `ans_${Date.now()}`;

          // Construct full answer object
          const fullAnswer: InterviewAnswer = {
            answerId,
            sessionId: this.session.sessionId,
            questionId: currentQ.questionId,
            answerText: answerData.answerText || "",
            submittedAt: new Date().toISOString(),
            responseTime: answerData.responseTime || 0,
            codeSubmission: answerData.codeSubmission,
            approachExplanation: answerData.codeSubmission?.approachExplanation,
            completenessScore: 0,
            relevanceScore: 0,
            communicationScore: 0
          };

          // 1. Submit the answer (save to state)
          await this.submitAnswer(fullAnswer);

          // 2. Evaluate with AI
          let aiResponseData: AIResponse | null = null;
          try {
            const evaluationPrompt = `
              You are an expert technical interviewer. Evaluate the candidate's answer to the following question.
              
              Question: ${currentQ.text}
              Type: ${currentQ.type}
              Difficulty: ${currentQ.difficulty}
              
              Candidate Answer: ${fullAnswer.answerText}
              ${fullAnswer.codeSubmission ? `Candidate Code (${fullAnswer.codeSubmission.language}):\n${fullAnswer.codeSubmission.code}` : ''}
              
              Provide a JSON response with:
              - feedback: Constructive feedback to the candidate (speak directly to them).
              - score: 0-100 score.
              - sentiment: "positive", "neutral", or "negative".
              - followUp: true/false if a follow-up is needed.
            `;

            const aiGenResponse = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
              messages: [{ role: "user", content: evaluationPrompt }]
            });

            let responseText = "";
            if (aiGenResponse) {
              if (typeof aiGenResponse.response === 'string') {
                responseText = aiGenResponse.response;
              } else if (typeof aiGenResponse === 'string') {
                responseText = aiGenResponse;
              } else if (aiGenResponse.result && typeof aiGenResponse.result.response === 'string') {
                responseText = aiGenResponse.result.response;
              }
            }

            const cleanResponse = responseText.replace(/```json|```/g, '').trim();
            const evaluation = JSON.parse(cleanResponse);

            // Create AI Response object
            aiResponseData = {
              responseId: `resp_${Date.now()}`,
              sessionId: this.session.sessionId,
              questionId: currentQ.questionId,
              type: AIResponseType.FEEDBACK,
              content: evaluation.feedback,
              generatedAt: new Date().toISOString(),
              sentiment: evaluation.sentiment as Sentiment || Sentiment.NEUTRAL,
              followUp: evaluation.followUp || false,
              responseTime: 0,
              confidence: 1
            };

            // Save AI response
            await this.addAIResponse(aiResponseData);

          } catch (aiError) {
            console.error("DO: AI evaluation failed:", aiError);
            // Fallback response
            aiResponseData = {
              responseId: `resp_${Date.now()}`,
              sessionId: this.session.sessionId,
              questionId: currentQ.questionId,
              type: AIResponseType.FEEDBACK,
              content: "Thank you for your answer. Let's proceed.",
              generatedAt: new Date().toISOString(),
              sentiment: Sentiment.NEUTRAL,
              followUp: false,
              responseTime: 0,
              confidence: 1
            };
            await this.addAIResponse(aiResponseData);
          }

          // 3. Determine next question (if any)
          // For now, we just return the current state, client calls /next

          return new Response(JSON.stringify({
            success: true,
            session: this.session,
            aiResponse: aiResponseData
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        case "/next":
          const nextResult = await this.nextQuestion();
          return new Response(JSON.stringify({ success: true, ...nextResult }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/end":
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const completedSession = await this.completeSession();
          return new Response(JSON.stringify({ success: true, session: completedSession }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/chat":
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const { message } = await request.json() as any;
          const chatResult = await this.chat(message);
          return new Response(JSON.stringify({ success: true, ...chatResult }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/state":
          return new Response(JSON.stringify({ success: true, session: this.session }), {
            headers: { "Content-Type": "application/json" }
          });

        case "/update-state":
          if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
          }
          const updates = await request.json() as any;
          if (this.session) {
            this.session = { ...this.session, ...updates };
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
  private namespace: DurableObjectNamespace;

  constructor(namespace: DurableObjectNamespace) {
    this.namespace = namespace;
  }

  getSessionStub(sessionId: string): DurableObjectStub {
    const id = this.namespace.idFromName(sessionId);
    return this.namespace.get(id);
  }

  async createSession(userId: string, mode: InterviewMode, jobType: string, difficulty: Difficulty, estimatedDuration: number = 45, jobTitle?: string, jobDescription?: string, seniority?: string): Promise<{ sessionId: string, session: InterviewSession }> {
    const sessionId = crypto.randomUUID();
    const stub = this.getSessionStub(sessionId);
    const response = await stub.fetch("http://internal/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mode, jobType, difficulty, estimatedDuration, sessionId, jobTitle, jobDescription, seniority })
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const data = await response.json() as any;
    return { sessionId, session: data.session };
  }
}