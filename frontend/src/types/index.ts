// Shared types from backend
// In a real monorepo, this would be a shared package
// For now, we duplicate the essential types needed for the frontend

export enum InterviewMode {
    TECHNICAL = "technical",
    BEHAVIORAL = "behavioral",
    MIXED = "mixed"
}

export enum InterviewStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    TIMEOUT = "timeout"
}

export enum QuestionType {
    CODING = "coding",
    THEORY = "theory",
    BEHAVIORAL = "behavioral",
    SCENARIO = "scenario",
    SYSTEM_DESIGN = "system_design",
    PRODUCT_DESIGN = "product_design"
}

export enum Difficulty {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    EXPERT = "expert"
}

export enum ProgrammingLanguage {
    PYTHON = "python",
    JAVASCRIPT = "javascript",
    TYPESCRIPT = "typescript",
    JAVA = "java",
    CPP = "cpp",
    CSHARP = "csharp",
    GO = "go",
    RUST = "rust"
}

export enum ExperienceLevel {
    JUNIOR = "junior",
    MID = "mid",
    SENIOR = "senior",
    LEAD = "lead",
    PRINCIPAL = "principal"
}

export enum ProficiencyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced",
    EXPERT = "expert"
}

export enum FeedbackStyle {
    DETAILED = "detailed",
    CONCISE = "concise",
    ACTIONABLE = "actionable"
}

export enum AIResponseType {
    QUESTION = "question",
    FEEDBACK = "feedback",
    HINT = "hint",
    EVALUATION = "evaluation",
    ENCOURAGEMENT = "encouragement"
}

export enum Sentiment {
    POSITIVE = "positive",
    NEUTRAL = "neutral",
    NEGATIVE = "negative"
}

export interface STARResponse {
    situation: string;
    task: string;
    action: string;
    result: string;
    reflection?: string;
}

export interface TestCase {
    input: any;
    expectedOutput: any;
    description?: string;
}

export interface ComplexityAnalysis {
    timeComplexity: string;
    spaceComplexity: string;
    explanation: string;
}

export interface CodeStyleIssue {
    line: number;
    column: number;
    severity: "error" | "warning" | "info";
    message: string;
    rule: string;
}

export interface ExecutionResult {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
    memoryUsage: number;
}

export interface QuestionMetadata {
    difficultyWeight: number;
    popularity: number;
    lastUpdated: string;
    source?: string;
    relatedQuestions: string[];
}

export interface GrowthTrajectory {
    trend: "improving" | "stable" | "declining";
    velocity: number;
    confidence: number;
}

export interface BenchmarkComparison {
    role: string;
    categoryAverage: number;
    topQuartile: number;
    bottomQuartile: number;
    difference: number;
}

// Core Entities
export interface InterviewQuestion {
    questionId: string;
    type: QuestionType;
    category: string;
    difficulty: Difficulty;
    title: string;
    text: string;
    tags: string[];
    estimatedTime: number;
    followUpQuestions: string[];
    hints: string[];
    metadata: QuestionMetadata;
}

export interface CodeSubmission {
    submissionId: string;
    challengeId: string;
    language: ProgrammingLanguage;
    code: string;
    submittedAt: string;
    executionResult?: ExecutionResult;
    compilationErrors: string[];
    styleIssues: CodeStyleIssue[];
    complexityAnalysis?: string;
}

export interface InterviewAnswer {
    answerId: string;
    sessionId: string;
    questionId: string;
    answerText: string;
    submittedAt: string;
    responseTime: number;
    codeSubmission?: CodeSubmission;
    approachExplanation?: string;
    starFormat?: STARResponse;
    completenessScore?: number;
    relevanceScore?: number;
    communicationScore?: number;
}

export interface CodingChallenge extends InterviewQuestion {
    description: string;
    topics: string[];
    timeLimit: number;
    testCases: TestCase[];
    starterCode: Record<string, string>;
    optimalSolution: Record<string, string>;
    complexityAnalysis: ComplexityAnalysis;
    relatedChallenges: string[];
    difficultyWeight: number;
}

export interface SkillAssessment {
    skill: string;
    score: number;
    level: ProficiencyLevel;
    confidence: number;
    evidence: string[];
    growthTrajectory: GrowthTrajectory;
}

export interface BehavioralAssessment {
    competencies: Record<string, number>;
    starQuality: number;
    storytelling: number;
    impactDemonstration: number;
    selfAwareness: number;
}

export interface InterviewFeedback {
    feedbackId: string;
    sessionId: string;
    overallScore: number;
    summary: string;
    technicalSkills?: SkillAssessment;
    communication?: SkillAssessment;
    problemSolving?: SkillAssessment;
    domainKnowledge?: SkillAssessment;
    behavioralCompetencies?: BehavioralAssessment;
    strengths: string[];
    improvementAreas: string[];
    specificRecommendations: string[];
    percentileRank?: number;
    benchmarkComparison?: BenchmarkComparison;
    generatedAt: string;
    recommendation?: string;
}

export interface AIResponse {
    responseId: string;
    sessionId: string;
    questionId?: string;
    type: AIResponseType;
    content: string;
    generatedAt: string;
    sentiment: Sentiment;
    followUp: boolean;
    responseTime: number;
    confidence: number;
}

export interface ScenarioContext {
    scenarioId: string;
    description: string;
    constraints: string[];
    successCriteria: string[];
    timeLimit: number;
}

export interface InterviewSession {
    sessionId: string;
    userId: string;
    mode: InterviewMode;
    jobType: string;
    jobTitle?: string;
    jobDescription?: string;
    seniority?: ExperienceLevel;
    difficulty: Difficulty;
    status: InterviewStatus;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    duration: number;
    currentQuestionIndex: number;
    questions: InterviewQuestion[];
    answers: InterviewAnswer[];
    aiResponses: AIResponse[];
    feedback?: InterviewFeedback;
    codingChallenge?: CodingChallenge;
    codeSubmissions: CodeSubmission[];
    scenarioContext?: ScenarioContext;
}

export interface CreateSessionRequest {
    mode: InterviewMode;
    jobType: string;
    jobTitle?: string;
    difficulty?: Difficulty;
    duration?: number;
    language?: ProgrammingLanguage;
    includeCoding?: boolean;
    topics?: string[];
    jobDescription?: string;
    seniority?: ExperienceLevel;
}

export interface SubmitAnswerRequest {
    answerText: string;
    codeSubmission?: {
        language: ProgrammingLanguage;
        code: string;
        approachExplanation?: string;
    };
    responseTime?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
}
