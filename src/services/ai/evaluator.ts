/**
 * AI Evaluator Service
 * Handles evaluation of code submissions and behavioral responses
 */

import { CodingChallenge, STARResponse, Sentiment } from "../../types";

export class AIEvaluator {
    private AI: any;
    private readonly DEFAULT_TEMPERATURE = 0.3; // Lower for more precise evaluation
    private readonly MAX_TOKENS = 1000;

    constructor(ai: any) {
        this.AI = ai;
    }

    /**
     * Evaluate code submission
     */
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
            const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                prompt: evaluationPrompt,
                temperature: this.DEFAULT_TEMPERATURE,
                max_tokens: this.MAX_TOKENS
            });

            const evaluation = this.extractResponseText(response);

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

    /**
     * Conduct behavioral evaluation using STAR method
     */
    async conductBehavioralEvaluation(
        questionText: string,
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

Question: ${questionText}

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
            const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                prompt: behavioralPrompt,
                temperature: this.DEFAULT_TEMPERATURE,
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

    /**
     * Analyze sentiment of text
     */
    async analyzeSentiment(text: string): Promise<Sentiment> {
        const sentimentPrompt = `
Analyze the sentiment of this text: "${text}"

Options: positive, neutral, negative

Respond with only one word.
`;

        try {
            const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
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

    /**
     * Helper method to extract response text from AI response
     */
    private extractResponseText(response: any): string {
        if (typeof response === "string") {
            return response;
        } else if (response && typeof response === "object" && "response" in response) {
            return (response as any).response || "";
        }
        return "";
    }
}
