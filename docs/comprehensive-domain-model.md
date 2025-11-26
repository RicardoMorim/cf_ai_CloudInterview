# CloudInterview - Comprehensive Domain Model

## Overview

This document presents the complete domain model for CloudInterview, an AI-powered interview simulation platform. The model is designed using Domain-Driven Design principles and captures all entities, value objects, aggregates, and their relationships.

## Domain Context

CloudInterview operates in the **Interview Simulation Domain**, where the primary goal is to provide realistic job interview practice through AI-powered agents. The system supports both technical and behavioral interview modes with dynamic question generation and adaptive feedback.

## Core Domain Entities

### 1. User

The `User` entity represents a candidate using the platform for interview practice.

```typescript
interface User {
  userId: string;           // Unique identifier (UUID)
  email: string;           // Email address (for account recovery)
  name: string;            // Display name
  profile: UserProfile;    // Candidate profile and preferences
  createdAt: Date;         // Account creation timestamp
  lastActive: Date;        // Last activity timestamp
  sessions: InterviewSession[]; // Interview history
  preferences: UserPreferences; // Platform preferences
}
```

**UserProfile Value Object:**
```typescript
interface UserProfile {
  jobTitles: string[];         // Target job roles (e.g., "Senior SWE", "DevOps Engineer")
  experienceLevel: ExperienceLevel; // Junior, Mid, Senior, Lead
  primaryLanguages: string[];  // Programming languages (for technical interviews)
  industries: string[];        // Target industries (e.g., "Tech", "Finance", "Healthcare")
  resumeSummary: string;       // Brief professional summary
  areasOfInterest: string[];   // Topics of interest for focused practice
}
```

### 2. InterviewSession

The `InterviewSession` aggregate root manages the complete interview lifecycle.

```typescript
interface InterviewSession {
  sessionId: string;           // Unique session identifier
  userId: string;             // Owner of the session
  mode: InterviewMode;        // Technical or Behavioral
  jobType: string;            // Target job role
  difficulty: Difficulty;     // Session difficulty level
  status: InterviewStatus;    // Pending, InProgress, Completed, Cancelled
  createdAt: Date;            // Session start time
  startedAt: Date | null;     // When interview actually started
  completedAt: Date | null;   // When interview was completed
  duration: number;           // Total session duration in seconds
  
  // Session state
  currentQuestionIndex: number;    // Index of current question
  questions: InterviewQuestion[];  // Ordered list of questions
  answers: InterviewAnswer[];      // User responses
  aiResponses: AIResponse[];       // AI interviewer responses
  feedback: InterviewFeedback | null; // Final evaluation
  
  // Technical interview specific
  codingChallenge: CodingChallenge | null; // Active coding challenge
  codeSubmissions: CodeSubmission[];        // Code snippets submitted
  
  // Behavioral interview specific
  scenarioContext: ScenarioContext | null;  // Behavioral scenario context
}
```

### 3. InterviewQuestion

Base entity for all question types in the system.

```typescript
interface InterviewQuestion {
  questionId: string;         // Unique identifier
  type: QuestionType;         // Coding, Theory, Behavioral, Scenario
  category: string;          // Question category (e.g., "Arrays", "System Design")
  difficulty: Difficulty;    // Easy, Medium, Hard, Expert
  title: string;             // Question title
  text: string;              // Full question description
  tags: string[];            // Relevant tags for filtering
  estimatedTime: number;     // Estimated time to answer (minutes)
  followUpQuestions: string[]; // Potential follow-up questions
  hints: string[];           // Hints that can be provided
  metadata: QuestionMetadata; // Additional question data
}
```

**Question Types:**

1. **CodingQuestion**: Extends InterviewQuestion with coding-specific data
2. **TheoryQuestion**: Technical conceptual questions
3. **BehavioralQuestion**: Behavioral and situational questions
4. **ScenarioQuestion**: Complex multi-part scenarios

### 4. CodingChallenge

Specialized entity for coding interview challenges.

```typescript
interface CodingChallenge {
  challengeId: string;        // Unique identifier
  title: string;              // Challenge title
  description: string;        // Detailed problem description
  difficulty: Difficulty;     // Challenge difficulty
  category: string;          // Primary category (e.g., "Data Structures")
  topics: string[];          // Related topics (e.g., ["Arrays", "Hash Tables"])
  timeLimit: number;         // Time limit in minutes
  testCases: TestCase[];     // Sample test cases
  starterCode: Record<string, string>; // Language-specific starter code
  optimalSolution: Record<string, string>; // Optimal solutions by language
  complexityAnalysis: ComplexityAnalysis; // Time/space complexity
  relatedChallenges: string[]; // Similar challenges
  difficultyWeight: number;   // Weighting for adaptive difficulty
}
```

### 5. InterviewAnswer

Captures user responses to interview questions.

```typescript
interface InterviewAnswer {
  answerId: string;           // Unique identifier
  sessionId: string;         // Associated session
  questionId: string;        // Question being answered
  answerText: string;        // User's response text
  submittedAt: Date;         // Timestamp of submission
  responseTime: number;      // Time taken to answer (seconds)
  
  // Technical answers
  codeSubmission: CodeSubmission | null; // For coding questions
  approachExplanation: string;           // Explanation of approach
  
  // Behavioral answers
  starFormat: STARResponse | null;       // STAR method response
  
  // Quality metrics (calculated by AI)
  completenessScore: number | null;      // 0-100 score
  relevanceScore: number | null;         // 0-100 score
  communicationScore: number | null;     // 0-100 score
}
```

### 6. AIResponse

Captures the AI interviewer's responses and feedback.

```typescript
interface AIResponse {
  responseId: string;         // Unique identifier
  sessionId: string;         // Associated session
  questionId: string | null; // Question context (if applicable)
  type: AIResponseType;      // Question, Feedback, Hint, Evaluation
  content: string;           // AI response text
  generatedAt: Date;         // Timestamp
  sentiment: Sentiment;      // Positive, Neutral, Negative
  followUp: boolean;         // Indicates if follow-up expected
  
  // Response metrics
  responseTime: number;      // Time taken by AI to generate response
  confidence: number;        // AI confidence in response (0-1)
}
```

### 7. InterviewFeedback

Comprehensive evaluation generated at session completion.

```typescript
interface InterviewFeedback {
  feedbackId: string;         // Unique identifier
  sessionId: string;         // Associated session
  overallScore: number;      // 0-100 overall performance score
  summary: string;           // Narrative summary of performance
  
  // Detailed breakdown
  technicalSkills: SkillAssessment;    // Technical skill evaluation
  communication: SkillAssessment;      // Communication skills
  problemSolving: SkillAssessment;     // Problem-solving approach
  domainKnowledge: SkillAssessment;    // Domain-specific knowledge
  
  // Behavioral assessment (for behavioral interviews)
  behavioralCompetencies: BehavioralAssessment | null;
  
  // Strengths and areas for improvement
  strengths: string[];                 // Key strengths demonstrated
  improvementAreas: string[];          // Areas needing improvement
  specificRecommendations: string[];   // Actionable recommendations
  
  // Comparative analysis
  percentileRank: number;              // Performance relative to peers
  benchmarkComparison: BenchmarkComparison; // Comparison to role expectations
  
  generatedAt: Date;                   // Feedback generation timestamp
}
```

## Value Objects

### 1. STARResponse

Structured response format for behavioral questions.

```typescript
interface STARResponse {
  situation: string;    // Context and background
  task: string;         // Responsibility or task
  action: string;       // Specific actions taken
  result: string;       // Outcomes and impact
  reflection: string;   // Lessons learned (optional)
}
```

### 2. CodeSubmission

Code submitted by users for coding challenges.

```typescript
interface CodeSubmission {
  submissionId: string;     // Unique identifier
  challengeId: string;     // Associated challenge
  language: ProgrammingLanguage; // Language used
  code: string;            // Submitted code
  submittedAt: Date;       // Submission timestamp
  executionResult: ExecutionResult | null; // Runtime results (if executed)
  compilationErrors: string[]; // Compilation errors
  styleIssues: CodeStyleIssue[]; // Code style problems
  complexityAnalysis: string;    // User's complexity analysis
}
```

### 3. SkillAssessment

Evaluates performance in specific skill areas.

```typescript
interface SkillAssessment {
  skill: string;           // Skill name (e.g., "Algorithm Design")
  score: number;           // 0-100 performance score
  level: ProficiencyLevel; // Beginner, Intermediate, Advanced, Expert
  confidence: number;      // Assessment confidence (0-1)
  evidence: string[];      // Evidence supporting the assessment
  growthTrajectory: GrowthTrajectory; // Improvement trend
}
```

### 4. UserPreferences

User-specific platform preferences.

```typescript
interface UserPreferences {
  defaultMode: InterviewMode;              // Preferred interview mode
  defaultDifficulty: Difficulty;           // Preferred difficulty level
  languagePreferences: ProgrammingLanguage[]; // Preferred coding languages
  feedbackStyle: FeedbackStyle;            // Detailed, Concise, Actionable
  voiceInputEnabled: boolean;              // Whether to use voice input
  darkMode: boolean;                       // UI theme preference
  notifications: NotificationPreferences;  // Notification settings
}
```

## Enums and Constants

### 1. InterviewMode
```typescript
enum InterviewMode {
  TECHNICAL = "technical",
  BEHAVIORAL = "behavioral",
  MIXED = "mixed"
}
```

### 2. QuestionType
```typescript
enum QuestionType {
  CODING = "coding",
  THEORY = "theory",
  BEHAVIORAL = "behavioral",
  SCENARIO = "scenario",
  SYSTEM_DESIGN = "system_design",
  PRODUCT_DESIGN = "product_design"
}
```

### 3. Difficulty
```typescript
enum Difficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert"
}
```

### 4. InterviewStatus
```typescript
enum InterviewStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout"
}
```

### 5. ProgrammingLanguage
```typescript
enum ProgrammingLanguage {
  PYTHON = "python",
  JAVASCRIPT = "javascript",
  TYPESCRIPT = "typescript",
  JAVA = "java",
  CPP = "cpp",
  CSHARP = "csharp",
  GO = "go",
  RUST = "rust",
  PYTHON = "python"
}
```

## Aggregates

### 1. InterviewSession Aggregate

**Aggregate Root:** `InterviewSession`
**Boundary:** Session lifecycle management, question flow, answer collection, feedback generation
**Consistency:** Session state must remain consistent throughout the interview

**Key Invariants:**
- Session status transitions follow defined state machine
- Questions are presented in correct order
- Answers are associated with valid questions
- Feedback can only be generated for completed sessions

### 2. User Aggregate

**Aggregate Root:** `User`
**Boundary:** User profile, preferences, session history
**Consistency:** User data integrity and privacy

**Key Invariants:**
- Email uniqueness
- Profile data validation
- Session ownership verification

### 3. QuestionBank Aggregate

**Aggregate Root:** `QuestionBank` (service)
**Boundary:** Question management, categorization, difficulty assignment
**Consistency:** Question metadata integrity

## Domain Services

### 1. InterviewOrchestrationService

Coordinates the interview flow and manages session state transitions.

```typescript
interface InterviewOrchestrationService {
  startSession(user: User, mode: InterviewMode, jobType: string): Promise<InterviewSession>;
  presentNextQuestion(session: InterviewSession): Promise<InterviewQuestion>;
  evaluateAnswer(session: InterviewSession, answer: InterviewAnswer): Promise<AIResponse>;
  generateFeedback(session: InterviewSession): Promise<InterviewFeedback>;
  completeSession(session: InterviewSession): Promise<void>;
}
```

### 2. QuestionSelectionService

Selects appropriate questions based on user profile, session context, and adaptive difficulty.

```typescript
interface QuestionSelectionService {
  selectQuestions(user: User, mode: InterviewMode, difficulty: Difficulty, count: number): Promise<InterviewQuestion[]>;
  adaptDifficulty(session: InterviewSession, performance: PerformanceMetrics): Promise<Difficulty>;
  getFollowUpQuestions(question: InterviewQuestion, answer: InterviewAnswer): Promise<InterviewQuestion[]>;
}
```

### 3. FeedbackGenerationService

Generates comprehensive feedback using AI analysis of session data.

```typescript
interface FeedbackGenerationService {
  analyzeTechnicalPerformance(session: InterviewSession): Promise<TechnicalAssessment>;
  analyzeBehavioralResponse(answer: InterviewAnswer): Promise<BehavioralAnalysis>;
  generateOverallFeedback(session: InterviewSession): Promise<InterviewFeedback>;
  createRecommendations(session: InterviewSession): Promise<LearningRecommendations>;
}
```

## Repositories

### 1. InterviewSessionRepository

Manages persistence of interview sessions.

```typescript
interface InterviewSessionRepository {
  save(session: InterviewSession): Promise<void>;
  findById(sessionId: string): Promise<InterviewSession | null>;
  findByUser(userId: string, limit?: number): Promise<InterviewSession[]>;
  delete(sessionId: string): Promise<void>;
}
```

### 2. QuestionRepository

Manages question bank persistence and retrieval.

```typescript
interface QuestionRepository {
  findById(questionId: string): Promise<InterviewQuestion | null>;
  findByCriteria(criteria: QuestionSearchCriteria): Promise<InterviewQuestion[]>;
  save(question: InterviewQuestion): Promise<void>;
  update(question: InterviewQuestion): Promise<void>;
  delete(questionId: string): Promise<void>;
}
```

### 3. UserRepository

Manages user data persistence.

```typescript
interface UserRepository {
  save(user: User): Promise<void>;
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(userId: string): Promise<void>;
}
```

## Application Services

### 1. InterviewManagementService

Application-level service for managing interview sessions.

```typescript
interface InterviewManagementService {
  createSession(userId: string, mode: InterviewMode, jobType: string): Promise<InterviewSession>;
  submitAnswer(sessionId: string, answer: InterviewAnswer): Promise<AIResponse>;
  getSessionTranscript(sessionId: string): Promise<SessionTranscript>;
  exportSessionData(sessionId: string): Promise<SessionExport>;
}
```

### 2. UserExperienceService

Manages user interactions and preferences.

```typescript
interface UserExperienceService {
  updateUserProfile(userId: string, profile: UserProfile): Promise<User>;
  getRecommendedSessions(userId: string): Promise<SessionRecommendation[]>;
  generateProgressReport(userId: string): Promise<ProgressReport>;
}
```

## Infrastructure

### 1. Persistence Layer

- **Durable Objects**: Session state management
- **Cloudflare KV**: Question bank and static content
- **R2 Storage**: Large files, transcripts, code submissions
- **D1 Database**: User data and session metadata

### 2. AI Integration

- **Workers AI**: LLM-powered question generation and feedback
- **Agents SDK**: Stateful AI conversation management
- **Prompt Templates**: Structured prompts for consistent AI behavior

### 3. External Integrations

- **Web Speech API**: Voice input for natural conversation
- **Code Execution Services**: Runtime code validation (where applicable)
- **Analytics Services**: Performance tracking and insights

## Domain Events

### 1. SessionStartedEvent
Published when an interview session begins.

### 2. QuestionAnsweredEvent  
Published when a user submits an answer.

### 3. FeedbackGeneratedEvent
Published when session feedback is generated.

### 4. SessionCompletedEvent
Published when an interview session is completed.

### 5. UserProgressUpdatedEvent
Published when user progress metrics are updated.

## Security and Privacy

### 1. Data Classification
- **Public**: Question bank content
- **Internal**: Session metadata, performance analytics
- **Confidential**: User responses, personal data, feedback
- **Restricted**: Authentication data, payment information

### 2. Privacy Considerations
- User responses are private by default
- Session data is encrypted at rest
- Users can delete their data at any time
- Anonymous usage option available

### 3. Security Measures
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure session management
- Regular security audits

This comprehensive domain model provides a solid foundation for implementing CloudInterview with clear boundaries, consistent behavior, and extensible architecture.