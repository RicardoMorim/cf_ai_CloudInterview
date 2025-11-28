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
}

export interface InterviewAnswer {
    answerId: string;
    sessionId: string;
    questionId: string;
    answerText: string;
    submittedAt: string;
    responseTime: number;
    codeSubmission?: {
        language: ProgrammingLanguage;
        code: string;
        approachExplanation?: string;
    };
}

export interface AIResponse {
    responseId: string;
    sessionId: string;
    questionId?: string;
    type: "question" | "feedback" | "hint" | "evaluation" | "encouragement";
    content: string;
    generatedAt: string;
    sentiment: "positive" | "neutral" | "negative";
    followUp: boolean;
}

export interface InterviewSession {
    sessionId: string;
    userId: string;
    mode: InterviewMode;
    jobType: string;
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
}

export interface CreateSessionRequest {
    mode: InterviewMode;
    jobType: string;
    difficulty?: Difficulty;
    duration?: number;
    language?: ProgrammingLanguage;
    includeCoding?: boolean;
    topics?: string[];
}
