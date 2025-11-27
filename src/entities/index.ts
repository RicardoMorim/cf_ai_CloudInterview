// Domain Entities Implementation for CloudInterview

import {
  InterviewSession,
  InterviewQuestion,
  InterviewAnswer,
  InterviewFeedback,
  CodingChallenge,
  User,
  UserProfile,
  UserPreferences,
  SkillAssessment,
  AIResponse,
  CodeSubmission,
  STARResponse,
  FeedbackStyle,
  QuestionType,
  InterviewMode,
  InterviewStatus,
  Difficulty,
  ProgrammingLanguage,
  ExperienceLevel,
  ProficiencyLevel,
  BehavioralAssessment
} from "../types";

// Base Entity Class
export abstract class BaseEntity {
  protected constructor(
    public readonly id: string,
    public readonly createdAt: string = new Date().toISOString()
  ) {}
}

// Value Objects Implementation

export class UserProfileVO implements UserProfile {
  constructor(
    public readonly jobTitles: string[],
    public readonly experienceLevel: ExperienceLevel,
    public readonly primaryLanguages: string[],
    public readonly industries: string[],
    public readonly resumeSummary: string,
    public readonly areasOfInterest: string[]
  ) {}

  public static create(data: Partial<UserProfile>): UserProfileVO {
    return new UserProfileVO(
      data.jobTitles || [],
      data.experienceLevel || ExperienceLevel.MID,
      data.primaryLanguages || [],
      data.industries || [],
      data.resumeSummary || "",
      data.areasOfInterest || []
    );
  }

  public update(updateData: Partial<UserProfile>): UserProfileVO {
    return new UserProfileVO(
      updateData.jobTitles ?? this.jobTitles,
      updateData.experienceLevel ?? this.experienceLevel,
      updateData.primaryLanguages ?? this.primaryLanguages,
      updateData.industries ?? this.industries,
      updateData.resumeSummary ?? this.resumeSummary,
      updateData.areasOfInterest ?? this.areasOfInterest
    );
  }
}

export class UserPreferencesVO implements UserPreferences {
  constructor(
    public readonly defaultMode: InterviewMode,
    public readonly defaultDifficulty: Difficulty,
    public readonly languagePreferences: ProgrammingLanguage[],
    public readonly feedbackStyle: FeedbackStyle,
    public readonly voiceInputEnabled: boolean,
    public readonly darkMode: boolean,
    public readonly notifications: NotificationPreferences
  ) {}
}

export class NotificationPreferences {
  constructor(
    public readonly emailNotifications: boolean,
    public readonly sessionReminders: boolean,
    public readonly progressUpdates: boolean,
    public readonly marketing: boolean
  ) {}

  public static default(): NotificationPreferences {
    return new NotificationPreferences(true, true, true, false);
  }
}

export class STARResponseVO implements STARResponse {
  constructor(
    public readonly situation: string,
    public readonly task: string,
    public readonly action: string,
    public readonly result: string,
    public readonly reflection?: string
  ) {}

  public static create(
    situation: string,
    task: string,
    action: string,
    result: string,
    reflection?: string
  ): STARResponseVO {
    if (!situation || !task || !action || !result) {
      throw new Error("STAR response must contain all required fields");
    }
    return new STARResponseVO(situation, task, action, result, reflection);
  }
}

export class SkillAssessmentVO implements SkillAssessment {
  constructor(
    public readonly skill: string,
    public readonly score: number,
    public readonly level: ProficiencyLevel,
    public readonly confidence: number,
    public readonly evidence: string[],
    public readonly growthTrajectory: GrowthTrajectory
  ) {
    this.validateScore(score);
  }

  private validateScore(score: number): void {
    if (score < 0 || score > 100) {
      throw new Error("Score must be between 0 and 100");
    }
  }

  public static create(
    skill: string,
    score: number,
    level: ProficiencyLevel,
    confidence: number,
    evidence: string[],
    growthTrajectory: GrowthTrajectory
  ): SkillAssessmentVO {
    return new SkillAssessmentVO(skill, score, level, confidence, evidence, growthTrajectory);
  }

  public updateScore(newScore: number): SkillAssessmentVO {
    return new SkillAssessmentVO(
      this.skill,
      newScore,
      this.level,
      this.confidence,
      this.evidence,
      this.growthTrajectory
    );
  }
}

export class GrowthTrajectory {
  constructor(
    public readonly trend: "improving" | "stable" | "declining",
    public readonly velocity: number,
    public readonly confidence: number
  ) {}

  public static create(
    trend: "improving" | "stable" | "declining",
    velocity: number,
    confidence: number
  ): GrowthTrajectory {
    return new GrowthTrajectory(trend, velocity, confidence);
  }
}

// Supporting Types

export interface TestCase {
  input: any;
  expectedOutput: any;
  description?: string;
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

export interface CodeStyleIssue {
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
  rule: string;
}

export interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}

// Entity Implementations

export class InterviewQuestionEntity extends BaseEntity implements InterviewQuestion {
  constructor(
    public readonly questionId: string,
    public readonly type: QuestionType,
    public readonly category: string,
    public readonly difficulty: Difficulty,
    public readonly title: string,
    public readonly text: string,
    public readonly tags: string[],
    public readonly estimatedTime: number,
    public readonly followUpQuestions: string[],
    public readonly hints: string[],
    public readonly metadata: QuestionMetadata
  ) {
    super(questionId);
  }

  public static create(data: Omit<InterviewQuestion, "id" | "createdAt">): InterviewQuestionEntity {
    return new InterviewQuestionEntity(
      crypto.randomUUID(),
      data.type,
      data.category,
      data.difficulty,
      data.title,
      data.text,
      data.tags,
      data.estimatedTime,
      data.followUpQuestions,
      data.hints,
      data.metadata
    );
  }

  public update(updateData: Partial<Omit<InterviewQuestion, "id" | "createdAt">>): InterviewQuestionEntity {
    return new InterviewQuestionEntity(
      this.questionId,
      updateData.type ?? this.type,
      updateData.category ?? this.category,
      updateData.difficulty ?? this.difficulty,
      updateData.title ?? this.title,
      updateData.text ?? this.text,
      updateData.tags ?? this.tags,
      updateData.estimatedTime ?? this.estimatedTime,
      updateData.followUpQuestions ?? this.followUpQuestions,
      updateData.hints ?? this.hints,
      updateData.metadata ?? this.metadata
    );
  }

  public addHint(hint: string): InterviewQuestionEntity {
    return this.update({
      hints: [...this.hints, hint]
    });
  }

  public addFollowUpQuestion(question: string): InterviewQuestionEntity {
    return this.update({
      followUpQuestions: [...this.followUpQuestions, question]
    });
  }
}

export class CodingChallengeEntity extends InterviewQuestionEntity implements CodingChallenge {
  constructor(
    questionId: string,
    type: QuestionType,
    category: string,
    difficulty: Difficulty,
    title: string,
    text: string,
    tags: string[],
    estimatedTime: number,
    followUpQuestions: string[],
    hints: string[],
    metadata: QuestionMetadata,
    public readonly description: string,
    public readonly topics: string[],
    public readonly timeLimit: number,
    public readonly testCases: TestCase[],
    public readonly starterCode: Record<string, string>,
    public readonly optimalSolution: Record<string, string>,
    public readonly complexityAnalysis: ComplexityAnalysis,
    public readonly relatedChallenges: string[],
    public readonly difficultyWeight: number
  ) {
    super(questionId, type, category, difficulty, title, text, tags, estimatedTime, followUpQuestions, hints, metadata);
  }

  public static create(data: Omit<CodingChallenge, "id" | "createdAt">): CodingChallengeEntity {
    return new CodingChallengeEntity(
      crypto.randomUUID(),
      data.type,
      data.category,
      data.difficulty,
      data.title,
      data.text,
      data.tags,
      data.estimatedTime,
      data.followUpQuestions,
      data.hints,
      data.metadata,
      data.description || data.text, // Use text as description if not provided
      data.topics,
      data.timeLimit,
      data.testCases,
      data.starterCode,
      data.optimalSolution,
      data.complexityAnalysis,
      data.relatedChallenges,
      data.difficultyWeight
    );
  }

  public getStarterCode(language: ProgrammingLanguage): string {
    return this.starterCode[language] || this.starterCode[ProgrammingLanguage.JAVASCRIPT] || "";
  }

  public getOptimalSolution(language: ProgrammingLanguage): string {
    return this.optimalSolution[language] || this.optimalSolution[ProgrammingLanguage.JAVASCRIPT] || "";
  }
}

export class InterviewAnswerEntity extends BaseEntity implements InterviewAnswer {
  constructor(
    public readonly answerId: string,
    public readonly sessionId: string,
    public readonly questionId: string,
    public readonly answerText: string,
    public readonly submittedAt: string,
    public readonly responseTime: number,
    public readonly codeSubmission?: CodeSubmission,
    public readonly approachExplanation?: string,
    public readonly starFormat?: STARResponse,
    public readonly completenessScore?: number,
    public readonly relevanceScore?: number,
    public readonly communicationScore?: number
  ) {
    super(answerId, submittedAt);
  }

  public static create(data: Omit<InterviewAnswer, "id" | "createdAt">): InterviewAnswerEntity {
    return new InterviewAnswerEntity(
      crypto.randomUUID(),
      data.sessionId,
      data.questionId,
      data.answerText,
      new Date().toISOString(),
      data.responseTime,
      data.codeSubmission,
      data.approachExplanation,
      data.starFormat,
      data.completenessScore,
      data.relevanceScore,
      data.communicationScore
    );
  }

  public addScores(
    completenessScore: number,
    relevanceScore: number,
    communicationScore: number
  ): InterviewAnswerEntity {
    return new InterviewAnswerEntity(
      this.answerId,
      this.sessionId,
      this.questionId,
      this.answerText,
      this.submittedAt,
      this.responseTime,
      this.codeSubmission,
      this.approachExplanation,
      this.starFormat,
      completenessScore,
      relevanceScore,
      communicationScore
    );
  }

  public addCodeSubmission(codeSubmission: CodeSubmission): InterviewAnswerEntity {
    return new InterviewAnswerEntity(
      this.answerId,
      this.sessionId,
      this.questionId,
      this.answerText,
      this.submittedAt,
      this.responseTime,
      codeSubmission,
      this.approachExplanation,
      this.starFormat,
      this.completenessScore,
      this.relevanceScore,
      this.communicationScore
    );
  }
}

export class CodeSubmissionEntity extends BaseEntity implements CodeSubmission {
  constructor(
    public readonly submissionId: string,
    public readonly challengeId: string,
    public readonly language: ProgrammingLanguage,
    public readonly code: string,
    public readonly submittedAt: string,
    public readonly executionResult?: ExecutionResult,
    public readonly compilationErrors: string[] = [],
    public readonly styleIssues: CodeStyleIssue[] = [],
    public readonly complexityAnalysis?: string
  ) {
    super(submissionId, submittedAt);
  }

  public static create(data: Omit<CodeSubmission, "id" | "createdAt">): CodeSubmissionEntity {
    return new CodeSubmissionEntity(
      crypto.randomUUID(),
      data.challengeId,
      data.language,
      data.code,
      new Date().toISOString(),
      data.executionResult,
      data.compilationErrors,
      data.styleIssues,
      data.complexityAnalysis
    );
  }

  public addExecutionResult(result: ExecutionResult): CodeSubmissionEntity {
    return new CodeSubmissionEntity(
      this.submissionId,
      this.challengeId,
      this.language,
      this.code,
      this.submittedAt,
      result,
      this.compilationErrors,
      this.styleIssues,
      this.complexityAnalysis
    );
  }

  public addCompilationErrors(errors: string[]): CodeSubmissionEntity {
    return new CodeSubmissionEntity(
      this.submissionId,
      this.challengeId,
      this.language,
      this.code,
      this.submittedAt,
      this.executionResult,
      errors,
      this.styleIssues,
      this.complexityAnalysis
    );
  }
}

export class UserEntity extends BaseEntity implements User {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly profile: UserProfileVO,
    public readonly createdAt: string,
    public readonly lastActive: string,
    public readonly preferences: UserPreferencesVO,
    public readonly sessions: InterviewSession[] = []
  ) {
    super(userId, createdAt);
  }

  public static create(
    email: string,
    name: string,
    profile: UserProfileVO,
    preferences: UserPreferencesVO
  ): UserEntity {
    const now = new Date().toISOString();
    return new UserEntity(
      crypto.randomUUID(),
      email,
      name,
      profile,
      now,
      now,
      preferences,
      []
    );
  }

  public updateProfile(newProfile: UserProfileVO): UserEntity {
    return new UserEntity(
      this.userId,
      this.email,
      this.name,
      newProfile,
      this.createdAt,
      new Date().toISOString(),
      this.preferences,
      this.sessions
    );
  }

  public updatePreferences(newPreferences: UserPreferencesVO): UserEntity {
    return new UserEntity(
      this.userId,
      this.email,
      this.name,
      this.profile,
      this.createdAt,
      new Date().toISOString(),
      newPreferences,
      this.sessions
    );
  }

  public addSession(session: InterviewSession): UserEntity {
    return new UserEntity(
      this.userId,
      this.email,
      this.name,
      this.profile,
      this.createdAt,
      this.lastActive,
      this.preferences,
      [...this.sessions, session]
    );
  }

  public updateLastActive(): UserEntity {
    return new UserEntity(
      this.userId,
      this.email,
      this.name,
      this.profile,
      this.createdAt,
      new Date().toISOString(),
      this.preferences,
      this.sessions
    );
  }
}