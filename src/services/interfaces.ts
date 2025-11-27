// Domain Service Interfaces for CloudInterview

import {
  InterviewSession,
  InterviewQuestion,
  InterviewAnswer,
  InterviewFeedback,
  CodingChallenge,
  User,
  UserProfile,
  UserPreferences,
  QuestionSearchParams,
  PerformanceMetrics,
  SkillAssessment,
  AIResponse,
  CodeSubmission,
  STARResponse,
  BehavioralAssessment,
  ScenarioContext
} from "../types";

// Repository Interfaces

export interface InterviewSessionRepository {
  save(session: InterviewSession): Promise<void>;
  findById(sessionId: string): Promise<InterviewSession | null>;
  findByUser(userId: string, limit?: number, offset?: number): Promise<InterviewSession[]>;
  delete(sessionId: string): Promise<void>;
  updateStatus(sessionId: string, status: string): Promise<void>;
}

export interface QuestionRepository {
  findById(questionId: string): Promise<InterviewQuestion | null>;
  findByCriteria(criteria: QuestionSearchParams): Promise<InterviewQuestion[]>;
  findRandom(count: number, difficulty?: string, type?: string): Promise<InterviewQuestion[]>;
  save(question: InterviewQuestion): Promise<void>;
  update(question: InterviewQuestion): Promise<void>;
  delete(questionId: string): Promise<void>;
  getCount(filters?: Partial<QuestionSearchParams>): Promise<number>;
}

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(userId: string): Promise<void>;
  updateProfile(userId: string, profile: UserProfile): Promise<void>;
  updatePreferences(userId: string, preferences: UserPreferences): Promise<void>;
  incrementStats(userId: string, stats: Partial<UserStats>): Promise<void>;
}

export interface CodingChallengeRepository {
  findById(challengeId: string): Promise<CodingChallenge | null>;
  findByDifficulty(difficulty: string): Promise<CodingChallenge[]>;
  findByTopic(topic: string): Promise<CodingChallenge[]>;
  save(challenge: CodingChallenge): Promise<void>;
  update(challenge: CodingChallenge): Promise<void>;
  delete(challengeId: string): Promise<void>;
}

// Domain Service Interfaces

export interface InterviewOrchestrationService {
  startSession(
    user: User,
    mode: string,
    jobType: string,
    difficulty?: string,
    duration?: number
  ): Promise<InterviewSession>;
  
  presentNextQuestion(session: InterviewSession): Promise<{
    question: InterviewQuestion;
    session: Pick<InterviewSession, "currentQuestionIndex" | "questions">;
  }>;
  
  submitAnswer(
    session: InterviewSession,
    answer: InterviewAnswer
  ): Promise<{
    answer: InterviewAnswer;
    aiResponse: AIResponse;
    nextAction?: NextAction;
  }>;
  
  evaluateAnswer(session: InterviewSession, answer: InterviewAnswer): Promise<AIResponse>;
  
  generateFeedback(session: InterviewSession): Promise<InterviewFeedback>;
  
  completeSession(session: InterviewSession): Promise<InterviewSession>;
  
  adaptDifficulty(session: InterviewSession, performance: PerformanceMetrics): Promise<string>;
}

export interface QuestionSelectionService {
  selectQuestions(
    user: User,
    mode: string,
    difficulty: string,
    count: number
  ): Promise<InterviewQuestion[]>;
  
  adaptQuestionSelection(
    session: InterviewSession,
    performanceHistory: PerformanceMetrics[]
  ): Promise<InterviewQuestion[]>;
  
  getFollowUpQuestions(
    question: InterviewQuestion,
    answer: InterviewAnswer,
    context: string
  ): Promise<InterviewQuestion[]>;
  
  selectCodingChallenge(
    user: User,
    difficulty: string,
    topics?: string[]
  ): Promise<CodingChallenge>;
  
  selectBehavioralQuestion(
    user: User,
    jobType: string,
    scenario?: string
  ): Promise<InterviewQuestion>;
}

export interface FeedbackGenerationService {
  analyzeTechnicalPerformance(
    session: InterviewSession,
    answers: InterviewAnswer[]
  ): Promise<{
    technicalSkills: SkillAssessment;
    problemSolving: SkillAssessment;
    communication: SkillAssessment;
  }>;
  
  analyzeBehavioralResponse(
    answer: InterviewAnswer,
    starResponse?: STARResponse
  ): Promise<BehavioralAssessment>;
  
  generateOverallFeedback(
    session: InterviewSession,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): Promise<InterviewFeedback>;
  
  createRecommendations(
    session: InterviewSession,
    feedback: InterviewFeedback
  ): Promise<Array<{
    type: string;
    content: string;
    priority: "low" | "medium" | "high";
    estimatedTime: number;
  }>>;
  
  calculatePercentileRank(
    user: User,
    overallScore: number,
    session: InterviewSession
  ): Promise<number>;
}

export interface AIInterviewerService {
  generateQuestionPrompt(
    question: InterviewQuestion,
    context: string,
    userBackground: string
  ): Promise<string>;
  
  generateResponse(
    prompt: string,
    conversationHistory: AIResponse[],
    userAnswer?: string
  ): Promise<{
    content: string;
    sentiment: string;
    confidence: number;
    followUp: boolean;
  }>;
  
  evaluateCodeSubmission(
    codeSubmission: CodeSubmission,
    challenge: CodingChallenge,
    userApproach: string
  ): Promise<{
    correctness: number;
    completeness: number;
    style: number;
    complexityAnalysis: string;
    feedback: string;
  }>;
  
  generateHint(
    question: InterviewQuestion,
    userStruggle: string,
    hintLevel: number
  ): Promise<string>;
  
  conductBehavioralEvaluation(
    question: InterviewQuestion,
    starResponse: STARResponse
  ): Promise<{
    starQuality: number;
    storytelling: number;
    impactDemonstration: number;
    selfAwareness: number;
    feedback: string;
  }>;
}

export interface UserExperienceService {
  updateUserProfile(
    userId: string,
    profile: UserProfile
  ): Promise<User>;
  
  updateUserPreferences(
    userId: string,
    preferences: UserPreferences
  ): Promise<User>;
  
  getRecommendedSessions(
    user: User,
    limit?: number
  ): Promise<Array<{
    type: string;
    content: string;
    priority: string;
    estimatedTime: number;
  }>>;
  
  generateProgressReport(
    userId: string
  ): Promise<{
    overview: UserStats;
    performanceByCategory: PerformanceMetrics[];
    skillProgress: SkillAssessment[];
    recentActivity: ActivityLog[];
    recommendations: any[];
  }>;
  
  getAchievements(
    userId: string
  ): Promise<Array<{
    achievement: string;
    description: string;
    unlocked: boolean;
    progress: number;
  }>>;
}

// Value Objects and Supporting Types

export interface UserStats {
  totalSessions: number;
  averageScore: number;
  completionRate: number;
  streakDays: number;
  totalHours: number;
}

export interface ActivityLog {
  date: string;
  sessions: number;
  averageScore: number;
}

export interface NextAction {
  type: "question" | "follow_up" | "hint" | "evaluation" | "completion";
  message: string;
  maxResponseTime?: number;
  data?: any;
}

export interface ScenarioContextService {
  generateScenario(
    jobType: string,
    difficulty: string,
    topics?: string[]
  ): Promise<ScenarioContext>;
  
  evaluateScenarioResponse(
    scenario: ScenarioContext,
    response: string,
    timeSpent: number
  ): Promise<{
    score: number;
    feedback: string;
    areasEvaluated: string[];
  }>;
}

// External Service Interfaces

export interface KVService {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T, expiration?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

export class CloudflareKVService implements KVService {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, "json");
      return value as T;
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      return null;
    }
  }

  async put<T>(key: string, value: T, expiration?: number): Promise<void> {
    try {
      if (expiration) {
        await this.kv.put(key, JSON.stringify(value), { expiration });
      } else {
        await this.kv.put(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`KV put error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`KV delete error for key ${key}:`, error);
      throw error;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const result = await this.kv.list({ prefix });
      return result.keys.map(key => key.name);
    } catch (error) {
      console.error('KV list error:', error);
      return [];
    }
  }
}

export interface DurableObjectService {
  get<T>(id: string): Promise<T | null>;
  set<T>(id: string, data: T): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LLMService {
  generateText(
    prompt: string,
    systemPrompt?: string,
    temperature?: number
  ): Promise<string>;
  
  analyzeText(
    text: string,
    analysisType: "sentiment" | "complexity" | "relevance"
  ): Promise<any>;
  
  compareText(
    original: string,
    comparison: string
  ): Promise<{
    similarity: number;
    differences: string[];
    suggestions: string[];
  }>;
}

export interface SpeechRecognitionService {
  transcribeAudio(
    audioData: ArrayBuffer,
    language?: string
  ): Promise<{
    transcript: string;
    confidence: number;
    alternatives?: string[];
  }>;
  
  validateTranscript(
    transcript: string,
    context?: string
  ): Promise<{
    cleanedTranscript: string;
    detectedErrors: string[];
    suggestions: string[];
  }>;
}

// Event Interfaces

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventData: any;
  timestamp: string;
  userId?: string;
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}