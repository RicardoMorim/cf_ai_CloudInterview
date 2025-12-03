/**
 * AI Generator Service
 * Handles content generation (hints, scenarios, responses)
 */

import { InterviewQuestion, AIResponse, QuestionType } from "../../types";

export class AIGenerator {
    private AI: any;
    private readonly DEFAULT_TEMPERATURE = 0.7;
    private readonly MAX_TOKENS = 1000;

    constructor(ai: any) {
        this.AI = ai;
    }

    /**
     * Generate conversational response
     */
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

        const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            prompt: systemPrompt,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.MAX_TOKENS
        });

        const content = this.extractResponseText(response);

        // Determine if follow-up is needed
        const followUp = this.shouldFollowUp(content, userAnswer);

        // Calculate confidence
        const confidence = this.calculateConfidence(content, userAnswer);

        return {
            content,
            sentiment: "neutral",
            confidence,
            followUp
        };
    }

    /**
     * Generate hint for struggling user
     */
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

        const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            prompt: hintPrompt,
            temperature: 0.5,
            max_tokens: 300
        });

        return this.extractResponseText(response) || "Consider breaking down the problem into smaller parts.";
    }

    /**
     * Generate scenario-based questions
     */
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
            const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                prompt: scenarioPrompt,
                temperature: this.DEFAULT_TEMPERATURE,
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

    /**
     * Helper methods
     */
    private extractResponseText(response: any): string {
        if (typeof response === "string") {
            return response;
        } else if (response && typeof response === "object" && "response" in response) {
            return (response as any).response || "";
        }
        return "";
    }

    private shouldFollowUp(content: string, userAnswer?: string): boolean {
        const lowerContent = content.toLowerCase();
        return lowerContent.includes("what about") ||
            lowerContent.includes("how would you") ||
            lowerContent.includes("can you explain") ||
            lowerContent.includes("tell me more") ||
            lowerContent.includes("why did you");
    }

    private calculateConfidence(content: string, userAnswer?: string): number {
        if (!userAnswer) return 0.8;

        const contentLength = content.length;
        if (contentLength < 50) return 0.3;
        if (contentLength > 500) return 0.9;

        return 0.3 + (contentLength / 1000);
    }
}
