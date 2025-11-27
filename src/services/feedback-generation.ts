// Feedback Generation Service for CloudInterview

import {
  InterviewSession,
  InterviewAnswer,
  InterviewFeedback,
  SkillAssessment,
  BehavioralAssessment,
  QuestionType,
  Difficulty,
  ProficiencyLevel,
  STARResponse,
  User
} from "../types";
import { FeedbackGenerationService as FeedbackGenerationServiceInterface } from "./interfaces";

export class FeedbackGenerationService implements FeedbackGenerationServiceInterface {
  private AI: any; // Workers AI binding

  constructor(ai: any) {
    this.AI = ai;
  }

  // Analyze technical performance
  async analyzeTechnicalPerformance(
    session: InterviewSession,
    answers: InterviewAnswer[]
  ): Promise<{
    technicalSkills: SkillAssessment;
    problemSolving: SkillAssessment;
    communication: SkillAssessment;
  }> {
    const technicalAnswers = answers.filter(a => {
      const question = session.questions.find(q => q.questionId === a.questionId);
      return question && (question.type === QuestionType.CODING || question.type === QuestionType.THEORY);
    });

    if (technicalAnswers.length === 0) {
      return {
        technicalSkills: this.createDefaultAssessment("Technical Skills", 0),
        problemSolving: this.createDefaultAssessment("Problem Solving", 0),
        communication: this.createDefaultAssessment("Technical Communication", 0)
      };
    }

    // Calculate scores based on answer evaluations
    const totalScore = technicalAnswers.reduce((sum, answer) => {
      const scores = [
        answer.completenessScore || 0,
        answer.relevanceScore || 0,
        answer.communicationScore || 0
      ];
      return sum + scores.reduce((a, b) => a + b, 0) / scores.length;
    }, 0);

    const averageScore = totalScore / technicalAnswers.length;

    // Analyze problem solving approach
    const problemSolvingAnalysis = await this.analyzeProblemSolving(technicalAnswers);
    
    // Analyze technical communication
    const communicationAnalysis = await this.analyzeTechnicalCommunication(technicalAnswers);

    return {
      technicalSkills: this.createSkillAssessment(
        "Technical Skills",
        averageScore,
        this.getProficiencyLevel(averageScore),
        0.85,
        technicalAnswers.map(a => `Answer to ${this.getQuestionTitle(session, a.questionId)}`),
        problemSolvingAnalysis.growthTrajectory
      ),
      problemSolving: this.createSkillAssessment(
        "Problem Solving",
        problemSolvingAnalysis.score,
        this.getProficiencyLevel(problemSolvingAnalysis.score),
        0.9,
        problemSolvingAnalysis.evidence,
        problemSolvingAnalysis.growthTrajectory
      ),
      communication: this.createSkillAssessment(
        "Technical Communication",
        communicationAnalysis.score,
        this.getProficiencyLevel(communicationAnalysis.score),
        0.8,
        communicationAnalysis.evidence,
        communicationAnalysis.growthTrajectory
      )
    };
  }

  // Analyze behavioral response using STAR format
  async analyzeBehavioralResponse(
    answer: InterviewAnswer,
    starResponse?: STARResponse
  ): Promise<BehavioralAssessment> {
    if (!starResponse) {
      // Try to extract STAR components from the answer text
      starResponse = await this.extractStarComponents(answer.answerText);
    }

    const evaluationPrompt = `
Evaluate the following behavioral response using the STAR method:

Situation: ${starResponse.situation}
Task: ${starResponse.task}
Action: ${starResponse.action}
Result: ${starResponse.result}
Reflection: ${starResponse.reflection || "Not provided"}

Evaluation Criteria (score 0-100):
1. STAR Quality: How well is the STAR format followed?
2. Storytelling: Is the story engaging and well-structured?
3. Impact Demonstration: Does the response clearly show measurable impact?
4. Self-Awareness: Does the response show learning and reflection?

Provide detailed analysis for each criterion and overall feedback.

Format as JSON:
{
  "competencies": {
    "starQuality": number,
    "storytelling": number,
    "impactDemonstration": number,
    "selfAwareness": number
  },
  "feedback": string
}
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: evaluationPrompt,
        temperature: 0.3,
        max_tokens: 500
      });

      const evaluation = JSON.parse(response.response || "{}");
      
      return {
        competencies: evaluation.competencies || {
          starQuality: 50,
          storytelling: 50,
          impactDemonstration: 50,
          selfAwareness: 50
        },
        starQuality: (evaluation.competencies?.starQuality || 50),
        storytelling: (evaluation.competencies?.storytelling || 50),
        impactDemonstration: (evaluation.competencies?.impactDemonstration || 50),
        selfAwareness: (evaluation.competencies?.selfAwareness || 50)
      };
    } catch (error) {
      return {
        competencies: {
          starQuality: 50,
          storytelling: 50,
          impactDemonstration: 50,
          selfAwareness: 50
        },
        starQuality: 50,
        storytelling: 50,
        impactDemonstration: 50,
        selfAwareness: 50
      };
    }
  }

  // Generate comprehensive feedback
  async generateOverallFeedback(
    session: InterviewSession,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): Promise<InterviewFeedback> {
    const overallScore = this.calculateOverallScore(session, technicalAnalysis, behavioralAnalysis);
    
    const strengths = await this.identifyStrengths(session, technicalAnalysis, behavioralAnalysis);
    const improvementAreas = await this.identifyImprovementAreas(session, technicalAnalysis, behavioralAnalysis);
    const recommendations = await this.generateRecommendations(session, technicalAnalysis, behavioralAnalysis);

    // Get user from session (assuming session has userId)
    const user = { userId: session.userId } as User; // Simplified for now
    const percentileRank = await this.calculatePercentileRank(user, overallScore, session);

    return {
      feedbackId: `feedback_${session.sessionId}`,
      sessionId: session.sessionId,
      overallScore,
      summary: await this.generateSummary(session, overallScore, technicalAnalysis, behavioralAnalysis),
      technicalSkills: technicalAnalysis.technicalSkills,
      communication: technicalAnalysis.communication,
      problemSolving: technicalAnalysis.problemSolving,
      domainKnowledge: this.createDefaultAssessment("Domain Knowledge", overallScore),
      behavioralCompetencies: behavioralAnalysis,
      strengths,
      improvementAreas,
      specificRecommendations: recommendations,
      percentileRank,
      benchmarkComparison: await this.generateBenchmarkComparison(session, overallScore),
      generatedAt: new Date().toISOString()
    };
  }

  // Create personalized recommendations
  async createRecommendations(
    session: InterviewSession,
    feedback: InterviewFeedback
  ): Promise<Array<{
    type: string;
    content: string;
    priority: "low" | "medium" | "high";
    estimatedTime: number;
  }>> {
    const recommendationsPrompt = `
Based on this interview feedback, generate specific learning recommendations:

Session Mode: ${session.mode}
Job Type: ${session.jobType}
Overall Score: ${feedback.overallScore}/100

Strengths: ${feedback.strengths.join(", ")}
Areas for Improvement: ${feedback.improvementAreas.join(", ")}

Technical Skills Score: ${feedback.technicalSkills.score}/100
Communication Score: ${feedback.communication.score}/100
Problem Solving Score: ${feedback.problemSolving.score}/100

Generate 3-5 specific recommendations that the user can work on. For each recommendation, specify:
1. Type (practice, learn, review, etc.)
2. Specific content
3. Priority level (low, medium, high)
4. Estimated time to complete (in minutes)

Format as JSON array:
[
  {
    "type": "practice",
    "content": "Specific recommendation",
    "priority": "high",
    "estimatedTime": 60
  }
]
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: recommendationsPrompt,
        temperature: 0.6,
        max_tokens: 600
      });

      const recommendations = JSON.parse(response.response || "[]");
      
      return recommendations.map((rec: any) => ({
        type: rec.type || "practice",
        content: rec.content || "Work on improving your skills",
        priority: rec.priority || "medium",
        estimatedTime: rec.estimatedTime || 30
      }));
    } catch (error) {
      return [
        {
          type: "practice",
          content: "Continue practicing technical interview questions",
          priority: "medium",
          estimatedTime: 60
        },
        {
          type: "learn",
          content: "Review fundamental concepts in your target domain",
          priority: "medium",
          estimatedTime: 90
        }
      ];
    }
  }

  // Private helper methods

  private createSkillAssessment(
    skill: string,
    score: number,
    level: ProficiencyLevel,
    confidence: number,
    evidence: string[],
    growthTrajectory: any
  ): SkillAssessment {
    return {
      skill,
      score,
      level,
      confidence,
      evidence,
      growthTrajectory
    };
  }

  private createDefaultAssessment(skill: string, score: number): SkillAssessment {
    return this.createSkillAssessment(
      skill,
      score,
      this.getProficiencyLevel(score),
      0.5,
      ["Default assessment"],
      {
        trend: "stable" as const,
        velocity: 0,
        confidence: 0.5
      }
    );
  }

  private getProficiencyLevel(score: number): ProficiencyLevel {
    if (score >= 90) return ProficiencyLevel.EXPERT;
    if (score >= 75) return ProficiencyLevel.ADVANCED;
    if (score >= 60) return ProficiencyLevel.INTERMEDIATE;
    return ProficiencyLevel.BEGINNER;
  }

  private calculateOverallScore(
    session: InterviewSession,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): number {
    const technicalScore = technicalAnalysis.technicalSkills.score;
    const communicationScore = technicalAnalysis.communication.score;
    const problemSolvingScore = technicalAnalysis.problemSolving.score;
    
    let behavioralScore = 0;
    if (behavioralAnalysis) {
      behavioralScore = Object.values(behavioralAnalysis.competencies).reduce((sum, score) => sum + score, 0) / Object.keys(behavioralAnalysis.competencies).length;
    }

    // Weighted average based on session type
    if (session.mode === "technical") {
      return (technicalScore * 0.5) + (problemSolvingScore * 0.3) + (communicationScore * 0.2);
    } else if (session.mode === "behavioral") {
      return (behavioralScore * 0.6) + (communicationScore * 0.4);
    } else {
      return (technicalScore * 0.3) + (behavioralScore * 0.3) + (problemSolvingScore * 0.2) + (communicationScore * 0.2);
    }
  }

  private async analyzeProblemSolving(answers: InterviewAnswer[]): Promise<{
    score: number;
    evidence: string[];
    growthTrajectory: any;
  }> {
    // Analyze approach explanations and code submissions
    const approaches = answers
      .map(a => a.approachExplanation || a.answerText)
      .filter(Boolean);

    if (approaches.length === 0) {
      return {
        score: 50,
        evidence: ["No approach explanations provided"],
        growthTrajectory: { trend: "stable", velocity: 0, confidence: 0.5 }
      };
    }

    // Simple heuristic-based analysis
    const hasStructuredApproach = approaches.filter(a => 
      a.toLowerCase().includes("first") || 
      a.toLowerCase().includes("then") || 
      a.toLowerCase().includes("finally")
    ).length;

    const hasComplexityAnalysis = answers.filter(a => 
      a.codeSubmission?.complexityAnalysis
    ).length;

    const approachScore = (hasStructuredApproach / approaches.length * 50) + 
                         (hasComplexityAnalysis / answers.length * 50);

    return {
      score: Math.min(100, approachScore + 40), // Base score of 40
      evidence: approaches.slice(0, 3), // First 3 approaches as evidence
      growthTrajectory: { trend: "improving", velocity: 0.1, confidence: 0.7 }
    };
  }

  private async analyzeTechnicalCommunication(answers: InterviewAnswer[]): Promise<{
    score: number;
    evidence: string[];
    growthTrajectory: any;
  }> {
    const communicationScores = answers
      .map(a => a.communicationScore)
      .filter(score => score !== undefined);

    const avgCommunicationScore = communicationScores.length > 0 
      ? communicationScores.reduce((sum, score) => sum + score, 0) / communicationScores.length
      : 50;

    return {
      score: avgCommunicationScore,
      evidence: [`Average communication score: ${avgCommunicationScore}`],
      growthTrajectory: { trend: "stable", velocity: 0, confidence: 0.8 }
    };
  }

  private getQuestionTitle(session: InterviewSession, questionId: string): string {
    const question = session.questions.find(q => q.questionId === questionId);
    return question?.title || questionId;
  }

  // Calculate percentile rank (make it public to match interface)
  async calculatePercentileRank(user: User, overallScore: number, session: InterviewSession): Promise<number> {
    // This would ideally compare against historical data
    // For now, return a rough estimate based on score distribution
    if (overallScore >= 90) return 95;
    if (overallScore >= 80) return 85;
    if (overallScore >= 70) return 75;
    if (overallScore >= 60) return 65;
    if (overallScore >= 50) return 50;
    return 30;
  }

  private async extractStarComponents(answerText: string): Promise<STARResponse> {
    const extractionPrompt = `
Extract STAR components from this answer:

"${answerText}"

Return as JSON:
{
  "situation": "Extracted situation",
  "task": "Extracted task", 
  "action": "Extracted action",
  "result": "Extracted result",
  "reflection": "Extracted reflection (if any)"
}
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: extractionPrompt,
        temperature: 0.3,
        max_tokens: 400
      });

      const extracted = JSON.parse(response.response || "{}");
      
      return {
        situation: extracted.situation || "Not specified",
        task: extracted.task || "Not specified",
        action: extracted.action || "Not specified",
        result: extracted.result || "Not specified",
        reflection: extracted.reflection
      };
    } catch (error) {
      return {
        situation: "Not specified",
        task: "Not specified",
        action: "Not specified",
        result: "Not specified"
      };
    }
  }

  private async identifyStrengths(
    session: InterviewSession,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): Promise<string[]> {
    const strengthsPrompt = `
Identify key strengths from this interview session:

Session Mode: ${session.mode}
Job Type: ${session.jobType}
Technical Skills Score: ${technicalAnalysis.technicalSkills.score}/100
Problem Solving Score: ${technicalAnalysis.problemSolving.score}/100
Communication Score: ${technicalAnalysis.communication.score}/100
Behavioral Score: ${behavioralAnalysis ? Object.values(behavioralAnalysis.competencies).reduce((sum, score) => sum + score, 0) / Object.keys(behavioralAnalysis.competencies).length : 'N/A'}

Generate 3-5 specific strengths the candidate demonstrated.

Return as JSON array of strings.
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: strengthsPrompt,
        temperature: 0.6,
        max_tokens: 300
      });

      const strengths = JSON.parse(response.response || "[]");
      return Array.isArray(strengths) ? strengths : [];
    } catch (error) {
      return ["Good technical foundation", "Clear communication", "Problem-solving approach"];
    }
  }

  private async identifyImprovementAreas(
    session: InterviewSession,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): Promise<string[]> {
    const areasPrompt = `
Identify areas for improvement from this interview session:

Session Mode: ${session.mode}
Job Type: ${session.jobType}
Technical Skills Score: ${technicalAnalysis.technicalSkills.score}/100
Problem Solving Score: ${technicalAnalysis.problemSolving.score}/100
Communication Score: ${technicalAnalysis.communication.score}/100
Behavioral Score: ${behavioralAnalysis ? Object.values(behavioralAnalysis.competencies).reduce((sum, score) => sum + score, 0) / Object.keys(behavioralAnalysis.competencies).length : 'N/A'}

Generate 2-4 specific areas the candidate should work on.

Return as JSON array of strings.
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: areasPrompt,
        temperature: 0.6,
        max_tokens: 300
      });

      const areas = JSON.parse(response.response || "[]");
      return Array.isArray(areas) ? areas : [];
    } catch (error) {
      return ["Need more practice with system design", "Improve time management during interviews"];
    }
  }

  private async generateRecommendations(
    session: InterviewSession,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): Promise<string[]> {
    const recommendationsPrompt = `
Generate specific recommendations for improvement:

Session Mode: ${session.mode}
Job Type: ${session.jobType}
Current Scores: Technical ${technicalAnalysis.technicalSkills.score}/100, Communication ${technicalAnalysis.communication.score}/100

Generate 3-5 actionable recommendations.

Return as JSON array of strings.
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: recommendationsPrompt,
        temperature: 0.6,
        max_tokens: 400
      });

      const recommendations = JSON.parse(response.response || "[]");
      return Array.isArray(recommendations) ? recommendations : [];
    } catch (error) {
      return [
        "Practice more coding challenges on platforms like LeetCode",
        "Work on explaining your thought process more clearly",
        "Review common system design patterns"
      ];
    }
  }

  private async generateSummary(
    session: InterviewSession,
    overallScore: number,
    technicalAnalysis: any,
    behavioralAnalysis?: BehavioralAssessment
  ): Promise<string> {
    const summaryPrompt = `
Generate a concise summary of this interview performance:

Session Mode: ${session.mode}
Job Type: ${session.jobType}
Overall Score: ${overallScore}/100
Technical Skills: ${technicalAnalysis.technicalSkills.score}/100
Problem Solving: ${technicalAnalysis.problemSolving.score}/100
Communication: ${technicalAnalysis.communication.score}/100
Behavioral: ${behavioralAnalysis ? Object.values(behavioralAnalysis.competencies).reduce((sum, score) => sum + score, 0) / Object.keys(behavioralAnalysis.competencies).length : 'N/A'}

Generate a 2-3 sentence summary that highlights key performance points.

Return as a single string.
`;

    try {
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: summaryPrompt,
        temperature: 0.5,
        max_tokens: 200
      });

      return response.response || "Good interview performance with room for improvement in key areas.";
    } catch (error) {
      return "Good interview performance with room for improvement in key areas.";
    }
  }

  private async generateBenchmarkComparison(session: InterviewSession, overallScore: number): Promise<any> {
    return {
      role: session.jobType,
      categoryAverage: 75, // Would come from historical data
      topQuartile: 90,
      bottomQuartile: 60,
      difference: overallScore - 75
    };
  }
}