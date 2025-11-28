// AI Interviewer Agent for CloudInterview using Workers AI

import {
  InterviewQuestion,
  InterviewAnswer,
  InterviewFeedback,
  CodingChallenge,
  AIResponse,
  AIResponseType,
  Sentiment,
  STARResponse,
  BehavioralAssessment,
  ProgrammingLanguage,
  QuestionType
} from "../types";
import { AIInterviewerService } from "./interfaces";

export class AIInterviewerAgent implements AIInterviewerService {
  private AI: any; // Workers AI binding
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly MAX_TOKENS = 1000;

  constructor(ai: any) {
    this.AI = ai;
  }

  // Generate a question prompt for the LLM
  async generateQuestionPrompt(
    question: InterviewQuestion,
    context: string,
    userBackground: string
  ): Promise<string> {
    const prompt = `
You are an AI interviewer conducting a ${question.type} interview for a ${context} role.

Question: ${question.text}

User Background: ${userBackground}

Guidelines:
1. Present the question in a natural, conversational manner
2. Adapt the question to sound like a real interview scenario
3. For technical questions, provide appropriate context
4. For behavioral questions, set up a realistic scenario
5. Keep the introduction brief and professional
6. Ask follow-up questions if appropriate

Generate an engaging way to present this question to the candidate.
`;

    // Use Llama 3.3 model for better quality responses
    const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt,
      temperature: this.DEFAULT_TEMPERATURE,
      max_tokens: this.MAX_TOKENS
    });

    return this.extractResponseText(response);
  }

  // Generate AI response to user answer
  async generateResponse(
    prompt: string,
    conversationHistory: AIResponse[],
    userAnswer?: string
  ): Promise<{
    content: string;
    sentiment: string;
    confidence: number;
    followUp: boolean;
  }> {
    // Build conversation context
    let context = "Interview Context:\n";
    conversationHistory.slice(-3).forEach((msg, index) => {
      context += `${index + 1}. ${msg.type}: ${msg.content}\n`;
    });

    if (userAnswer) {
      context += `User Answer: ${userAnswer}\n`;
    }

    const systemPrompt = `
You are an AI interviewer providing feedback and follow-up questions. 

Context:
${context}

Instructions:
1. Provide constructive, encouraging feedback
2. Ask insightful follow-up questions
3. Be professional and supportive
4. Adapt your language to the user's technical level
5. Keep responses concise but thorough

Generate your response:
`;

    // Use Llama 3.3 model for better conversational responses
    const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: systemPrompt,
      temperature: this.DEFAULT_TEMPERATURE,
      max_tokens: this.MAX_TOKENS
    });

    const content = this.extractResponseText(response);

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(content);

    // Determine if follow-up is needed
    const followUp = this.shouldFollowUp(content, userAnswer);

    // Calculate confidence based on response length and engagement
    const confidence = this.calculateConfidence(content, userAnswer);

    return {
      content,
      sentiment,
      confidence,
      followUp
    };
  }

  // Evaluate code submission
  async evaluateCodeSubmission(
    codeSubmission: any,
    challenge: CodingChallenge,
    userApproach: string
  ): Promise<{
    correctness: number;
    completeness: number;
    style: number;
    complexityAnalysis: string;
    feedback: string;
  }> {
    const evaluationPrompt = `
Evaluate the following code submission for the challenge: ${challenge.title}

Challenge Description: ${challenge.description}
Expected Time Complexity: ${challenge.complexityAnalysis.timeComplexity}
Expected Space Complexity: ${challenge.complexityAnalysis.spaceComplexity}

User's Approach: ${userApproach}

User's Code:
\`\`\`${codeSubmission.language}
${codeSubmission.code}
\`\`\`

Evaluation Criteria:
1. Correctness: Does the code solve the problem correctly?
2. Completeness: Does it handle edge cases and all requirements?
3. Code Style: Is the code readable and well-structured?
4. Complexity: Does it match the expected time/space complexity?

Provide:
1. A correctness score (0-100)
2. A completeness score (0-100) 
3. A style score (0-100)
4. Analysis of the time/space complexity
5. Detailed, constructive feedback

Format your response as JSON with the following structure:
{
  "correctness": number,
  "completeness": number,
  "style": number,
  "complexityAnalysis": string,
  "feedback": string
}
`;

    try {
      // Use Llama 3.3 model for more accurate code evaluation
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: evaluationPrompt,
        temperature: 0.3, // Lower temperature for more precise evaluation
        max_tokens: this.MAX_TOKENS
      });

      const evaluation = this.extractResponseText(response);

      // Parse JSON response
      try {
        const parsed = JSON.parse(evaluation);
        return {
          correctness: parsed.correctness || 0,
          completeness: parsed.completeness || 0,
          style: parsed.style || 0,
          complexityAnalysis: parsed.complexityAnalysis || "",
          feedback: parsed.feedback || ""
        };
      } catch (parseError) {
        // If JSON parsing fails, return a generic evaluation
        return {
          correctness: 50,
          completeness: 50,
          style: 50,
          complexityAnalysis: "Unable to analyze complexity",
          feedback: "The code submission has been received. Please review the implementation for correctness and efficiency."
        };
      }
    } catch (error) {
      return {
        correctness: 0,
        completeness: 0,
        style: 0,
        complexityAnalysis: "Error during evaluation",
        feedback: "Unable to evaluate the code submission due to an error."
      };
    }
  }

  // Generate hint for struggling user
  async generateHint(
    question: InterviewQuestion,
    userStruggle: string,
    hintLevel: number
  ): Promise<string> {
    const hintPrompt = `
Generate a helpful hint for the following question:

Question: ${question.text}
User's struggle: ${userStruggle}
Hint level: ${hintLevel}/3 (1 = subtle, 2 = moderate, 3 = direct)

Guidelines:
- Be encouraging and supportive
- Don't give away the complete solution
- Provide just enough guidance to help them progress
- Adapt the hint to their specific struggle

Generate the hint:
`;

    // Use Llama 3.3 model for better hint generation
    const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: hintPrompt,
      temperature: 0.5,
      max_tokens: 300
    });

    return this.extractResponseText(response) || "Consider breaking down the problem into smaller parts.";
  }

  // Conduct behavioral evaluation using STAR method
  async conductBehavioralEvaluation(
    question: InterviewQuestion,
    starResponse: STARResponse
  ): Promise<{
    starQuality: number;
    storytelling: number;
    impactDemonstration: number;
    selfAwareness: number;
    feedback: string;
  }> {
    const behavioralPrompt = `
Evaluate the following behavioral response using the STAR method:

Question: ${question.text}

STAR Response:
Situation: ${starResponse.situation}
Task: ${starResponse.task}
Action: ${starResponse.action}
Result: ${starResponse.result}
Reflection: ${starResponse.reflection || "Not provided"}

Evaluation Criteria:
1. STAR Quality (0-100): How well does the response follow the STAR format?
2. Storytelling (0-100): Is the story engaging and well-structured?
3. Impact Demonstration (0-100): Does the response clearly show the impact?
4. Self-Awareness (0-100): Does the response show learning and reflection?

Provide detailed feedback and scores for each criterion.

Format as JSON:
{
  "starQuality": number,
  "storytelling": number,
  "impactDemonstration": number,
  "selfAwareness": number,
  "feedback": string
}
`;

    try {
      // Use Llama 3.3 model for better behavioral analysis
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: behavioralPrompt,
        temperature: 0.3,
        max_tokens: this.MAX_TOKENS
      });

      const evaluation = this.extractResponseText(response);

      try {
        const parsed = JSON.parse(evaluation);
        return {
          starQuality: parsed.starQuality || 0,
          storytelling: parsed.storytelling || 0,
          impactDemonstration: parsed.impactDemonstration || 0,
          selfAwareness: parsed.selfAwareness || 0,
          feedback: parsed.feedback || ""
        };
      } catch (parseError) {
        return {
          starQuality: 50,
          storytelling: 50,
          impactDemonstration: 50,
          selfAwareness: 50,
          feedback: "Unable to provide detailed evaluation. The response appears to follow the STAR format."
        };
      }
    } catch (error) {
      return {
        starQuality: 0,
        storytelling: 0,
        impactDemonstration: 0,
        selfAwareness: 0,
        feedback: "Unable to evaluate the behavioral response."
      };
    }
  }

  // Generate opening introduction
  async generateOpeningIntroduction(
    mode: string,
    jobType: string,
    userExperience: string
  ): Promise<string> {
    const introPrompt = `
You are an AI interviewer named Alex. Generate a warm, professional opening introduction for a ${mode} interview for a ${jobType} position.

User Experience Level: ${userExperience}

Guidelines:
1. Be welcoming and professional
2. Set expectations for the interview
3. Briefly explain the format
4. Encourage the candidate to do their best
5. Keep it concise (2-3 sentences)

Generate the introduction:
`;

    console.log("AIInterviewerAgent: Generating opening introduction...");
    try {
      // Use Llama 3.3 model for better opening introductions
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: introPrompt,
        temperature: 0.6,
        max_tokens: 200
      });

      console.log("AIInterviewerAgent: Generated introduction successfully");
      return this.extractResponseText(response) || "Welcome! Let's begin your interview.";
    } catch (error) {
      console.error("AIInterviewerAgent: Error generating introduction:", error);
      return `Welcome to your ${mode} interview for the ${jobType} position. I'm Alex, your AI interviewer. I'll be asking you a series of questions to assess your skills and experience. Please take your time and answer to the best of your ability. Let's get started!`;
    }
  }

  // Generate closing remarks
  async generateClosingRemarks(
    sessionPerformance: any,
    overallScore: number
  ): Promise<string> {
    const closingPrompt = `
Generate closing remarks for an interview session.

Session Performance Summary:
Overall Score: ${overallScore}/100

Guidelines:
1. Be professional and encouraging
2. Acknowledge their effort
3. Provide a brief summary of how they did
4. Offer some general advice for improvement
5. Thank them for their time
6. Keep it positive and supportive

Generate the closing remarks:
`;

    // Use Llama 3.3 model for better closing remarks
    const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: closingPrompt,
      temperature: 0.6,
      max_tokens: 300
    });

    return this.extractResponseText(response) || "Thank you for completing the interview. Great effort!";
  }

  // Generate scenario-based questions for system design or product design
  async generateScenarioQuestion(
    scenarioType: string,
    jobType: string,
    difficulty: string
  ): Promise<InterviewQuestion> {
    const scenarioPrompt = `
Generate a ${scenarioType} interview question for a ${jobType} position at ${difficulty} difficulty level.

Requirements:
1. Create a realistic scenario
2. Make it appropriate for the experience level
3. Include clear context and constraints
4. Make it open-ended to encourage discussion

Return as JSON:
{
  "questionId": "generated_${Date.now()}",
  "type": "${scenarioType === 'system design' ? QuestionType.SYSTEM_DESIGN : QuestionType.PRODUCT_DESIGN}",
  "category": "${scenarioType}",
  "difficulty": "${difficulty}",
  "title": "Scenario Title",
  "text": "Detailed scenario description with context and requirements",
  "tags": ["${scenarioType}", "design", "${difficulty}"],
  "estimatedTime": 20
}
`;

    try {
      // Use Llama 3.3 model for better scenario generation
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: scenarioPrompt,
        temperature: 0.7,
        max_tokens: this.MAX_TOKENS
      });

      const responseText = this.extractResponseText(response);
      const questionData = JSON.parse(responseText || "{}");

      return {
        questionId: questionData.questionId || `scenario_${Date.now()}`,
        type: questionData.type || QuestionType.SCENARIO,
        category: questionData.category || "scenario",
        difficulty: questionData.difficulty || "medium",
        title: questionData.title || "Scenario Question",
        text: questionData.text || "Please analyze this scenario...",
        tags: questionData.tags || ["scenario"],
        estimatedTime: questionData.estimatedTime || 20,
        followUpQuestions: [],
        hints: [],
        metadata: {
          difficultyWeight: 1,
          popularity: 0,
          lastUpdated: new Date().toISOString(),
          relatedQuestions: []
        }
      };
    } catch (error) {
      return {
        questionId: `fallback_scenario_${Date.now()}`,
        type: QuestionType.SCENARIO,
        category: "scenario",
        difficulty: difficulty as any,
        title: "System Design Scenario",
        text: "Design a scalable system for handling user requests...",
        tags: ["scenario", "design"],
        estimatedTime: 20,
        followUpQuestions: [],
        hints: [],
        metadata: {
          difficultyWeight: 1,
          popularity: 0,
          lastUpdated: new Date().toISOString(),
          relatedQuestions: []
        }
      };
    }
  }

  // Helper method to extract response text from AI response
  private extractResponseText(response: any): string {
    if (typeof response === "string") {
      return response;
    } else if (response && typeof response === "object" && "response" in response) {
      return (response as any).response || "";
    }
    return "";
  }

  // Private helper methods

  private async analyzeSentiment(text: string): Promise<Sentiment> {
    const sentimentPrompt = `
Analyze the sentiment of this text: "${text}"

Options: positive, neutral, negative

Respond with only one word.
`;

    try {
      // Use Llama 3.3 model for better sentiment analysis
      const response = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt: sentimentPrompt,
        temperature: 0.1,
        max_tokens: 10
      });

      const sentiment = this.extractResponseText(response)?.trim().toLowerCase();

      switch (sentiment) {
        case "positive":
          return Sentiment.POSITIVE;
        case "negative":
          return Sentiment.NEGATIVE;
        default:
          return Sentiment.NEUTRAL;
      }
    } catch (error) {
      return Sentiment.NEUTRAL;
    }
  }

  private shouldFollowUp(content: string, userAnswer?: string): boolean {
    // Simple heuristic: if the response asks a question or mentions follow-up
    const lowerContent = content.toLowerCase();
    return lowerContent.includes("what about") ||
      lowerContent.includes("how would you") ||
      lowerContent.includes("can you explain") ||
      lowerContent.includes("tell me more") ||
      lowerContent.includes("why did you");
  }

  private calculateConfidence(content: string, userAnswer?: string): number {
    if (!userAnswer) return 0.8; // High confidence for initial responses

    const contentLength = content.length;
    const answerLength = userAnswer.length;

    // Confidence based on engagement and response quality
    if (contentLength < 50) return 0.3;
    if (contentLength > 500) return 0.9;

    return 0.3 + (contentLength / 1000);
  }
}