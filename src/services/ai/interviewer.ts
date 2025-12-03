/**
 * AI Interviewer Service
 * Handles interview-specific AI operations (introductions, closings, question prompts)
 */

import { InterviewQuestion } from "../../types";

export class AIInterviewer {
    private AI: any;
    private readonly DEFAULT_TEMPERATURE = 0.7;
    private readonly MAX_TOKENS = 1000;

    constructor(ai: any) {
        this.AI = ai;
    }

    /**
     * Generate opening introduction
     */
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

        console.log("AIInterviewer: Generating opening introduction...");
        try {
            const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                prompt: introPrompt,
                temperature: 0.6,
                max_tokens: 200
            });

            console.log("AIInterviewer: Generated introduction successfully");
            return this.extractResponseText(response) || "Welcome! Let's begin your interview.";
        } catch (error) {
            console.error("AIInterviewer: Error generating introduction:", error);
            return `Welcome to your ${mode} interview for the ${jobType} position. I'm Alex, your AI interviewer. I'll be asking you a series of questions to assess your skills and experience. Please take your time and answer to the best of your ability. Let's get started!`;
        }
    }

    /**
     * Generate closing remarks
     */
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

        const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            prompt: closingPrompt,
            temperature: 0.6,
            max_tokens: 300
        });

        return this.extractResponseText(response) || "Thank you for completing the interview. Great effort!";
    }

    /**
     * Generate a question prompt for the LLM
     */
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

        const response: any = await this.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            prompt,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.MAX_TOKENS
        });

        return this.extractResponseText(response);
    }

    /**
     * Helper method to extract response text
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
