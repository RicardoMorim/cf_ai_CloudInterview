import { InterviewQuestion, InterviewMode, Difficulty, QuestionType, Essentials, Problem, LeetCodeProblem } from "../../types";

/**
 * Question Selector Service
 * Handles selecting appropriate questions for interview sessions
 */
export class QuestionSelector {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * Select questions for a technical interview
     * Uses AI to intelligently select 1-3 LeetCode problems based on job context
     */
    async selectTechnicalQuestions(
        jobType: string,
        difficulty: Difficulty,
        jobTitle?: string,
        jobDescription?: string,
        seniority?: string,
        storage?: DurableObjectStorage
    ): Promise<InterviewQuestion[]> {
        const selectedQuestions: InterviewQuestion[] = [];

        try {
            // 1. Fetch essentials list from KV
            let essentialsData: Essentials = await this.env.KV.get("essentials", { type: "json" });

            // Fallback to local data if KV is empty
            if (!essentialsData || !essentialsData.problems) {
                console.log("QuestionSelector: KV essentials missing, using local fallback");
                const { TECHNICAL_QUESTIONS } = await import("../../data/questions");
                essentialsData = {
                    problems: TECHNICAL_QUESTIONS.map(q => ({
                        questionId: q.questionId,
                        title: q.title,
                        difficulty: q.difficulty,
                        topics: q.tags
                    }))
                };

                // Also populate storage if provided
                if (storage) {
                    for (const q of TECHNICAL_QUESTIONS) {
                        await storage.put(`problem:${q.questionId}`, q);
                    }
                }
            }

            if (essentialsData && essentialsData.problems) {
                // 2. Filter problems by difficulty
                const candidates = essentialsData.problems.filter((p: any) => {
                    return p.difficulty && p.difficulty.toLowerCase() === difficulty.toLowerCase();
                });

                const pool = candidates.length > 0 ? candidates : essentialsData.problems;
                const limitedPool = pool.slice(0, 50);

                // 3. Ask AI to select 1-3 questions
                const questionIds = await this.selectQuestionsWithAI(
                    limitedPool,
                    jobType,
                    difficulty,
                    jobTitle,
                    jobDescription,
                    seniority
                );

                console.log(`QuestionSelector: AI selected question IDs:`, questionIds);

                // 4. Fetch full details for all selected problems
                for (const selectedId of questionIds) {
                    if (selectedId && selectedId !== "0") {
                        const fullProblem = await this.env.KV.get(`problem:${selectedId}`, { type: "json" }) as LeetCodeProblem;

                        if (fullProblem) {
                            console.log("QuestionSelector: Full problem details:", fullProblem);

                            // Convert to InterviewQuestion format
                            const question: InterviewQuestion = {
                                questionId: fullProblem.id.toString(),
                                type: QuestionType.CODING,
                                category: fullProblem.metadata?.category || "algorithms",
                                difficulty: fullProblem.difficulty.toLowerCase() as any,
                                title: fullProblem.title,
                                text: fullProblem.description,
                                tags: fullProblem.metadata?.topics || [],
                                estimatedTime: 30,
                                followUpQuestions: [],
                                hints: fullProblem.metadata?.hints || [],
                                metadata: {
                                    difficultyWeight: 1,
                                    popularity: fullProblem.metadata?.likes || 0,
                                    lastUpdated: new Date().toISOString(),
                                    relatedQuestions: fullProblem.metadata?.similar_questions?.map((sq: any) => sq.titleSlug) || [],
                                    leetcodeSlug: fullProblem.titleSlug
                                }
                            };

                            selectedQuestions.push(question);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("QuestionSelector: Error selecting technical questions:", error);
            // Fallback will be handled by caller
        }

        return selectedQuestions;
    }

    /**
     * Generate behavioral interview questions using AI
     */
    async selectBehavioralQuestions(
        jobType: string,
        difficulty: Difficulty,
        jobTitle?: string,
        jobDescription?: string,
        seniority?: string
    ): Promise<InterviewQuestion[]> {
        try {
            const prompt = `
You are an expert behavioral interviewer.
Job Role: ${jobType}
${jobTitle ? `Job Title: ${jobTitle}` : ''}
${seniority ? `Seniority Level: ${seniority}` : ''}
${jobDescription ? `Job Description Context: ${jobDescription.substring(0, 500)}...` : ''}

Task: Generate a behavioral interview question tailored to this specific role and seniority.
The question should assess soft skills relevant to the position (e.g., leadership for seniors, learning for juniors).

Return ONLY the JSON object with this structure:
{
  "questionId": "gen_beh_${Date.now()}",
  "title": "Short Title",
  "text": "The full question text...",
  "difficulty": "${difficulty}",
  "tags": ["Tag1", "Tag2"],
  "hints": ["Hint 1", "Hint 2"]
}
`;

            const response: any = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                messages: [{ role: "user", content: prompt }]
            });

            let responseText = "";
            if (response && response.response) {
                responseText = response.response;
            }

            const cleanResponse = responseText.replace(/```json|```/g, '').trim();
            const questionData = JSON.parse(cleanResponse);

            return [{
                questionId: questionData.questionId || `gen_beh_${Date.now()}`,
                type: QuestionType.BEHAVIORAL,
                category: "Behavioral",
                difficulty: difficulty,
                title: questionData.title || "Behavioral Question",
                text: questionData.text || "Tell me about a time you faced a challenge.",
                tags: questionData.tags || ["Behavioral"],
                estimatedTime: 15,
                followUpQuestions: [],
                hints: questionData.hints || [],
                metadata: {
                    difficultyWeight: 1,
                    popularity: 0,
                    lastUpdated: new Date().toISOString(),
                    relatedQuestions: []
                }
            }];
        } catch (error) {
            console.error("QuestionSelector: Error generating behavioral question:", error);
            // Return fallback question
            return [{
                questionId: `fallback_beh_${Date.now()}`,
                type: QuestionType.BEHAVIORAL,
                category: "Behavioral",
                difficulty: difficulty,
                title: "Leadership Challenge",
                text: "Tell me about a time when you had to lead a team through a difficult situation.",
                tags: ["Behavioral", "Leadership"],
                estimatedTime: 15,
                followUpQuestions: [],
                hints: ["Think about the specific situation", "Focus on your actions", "Describe the outcome"],
                metadata: {
                    difficultyWeight: 1,
                    popularity: 0,
                    lastUpdated: new Date().toISOString(),
                    relatedQuestions: []
                }
            }];
        }
    }

    /**
     * Use AI to intelligently select questions based on job context
     */
    private async selectQuestionsWithAI(
        pool: Problem[],
        jobType: string,
        difficulty: Difficulty,
        jobTitle?: string,
        jobDescription?: string,
        seniority?: string
    ): Promise<string[]> {
        try {
            const prompt = `
You are an expert technical interviewer. 
Job Role: ${jobType}
${jobTitle ? `Job Title: ${jobTitle}` : ''}
${seniority ? `Seniority Level: ${seniority}` : ''}
Difficulty: ${difficulty}
${jobDescription ? `Job Description Context: ${jobDescription.substring(0, 300)}...` : ''}

Available LeetCode Problems (first 50):
${pool.map((p: any) => `${p.questionId}: ${p.title} (${p.topics ? p.topics.join(', ') : ''})`).join('\n')}

Task: Select 1-3 appropriate coding problems for this interview.
- Choose problems that test different aspects (e.g., arrays, strings, algorithms)
- Variety is important - pick complementary problems
- Return a JSON array of question IDs: ["1262", "1931", "2045"]
- Return ONLY the JSON array, nothing else
- RESPOND IN ENGLISH ONLY

Return format example: ["1262", "1931"]
`;

            const response: any = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                messages: [{ role: "user", content: prompt }]
            });

            console.log("QuestionSelector: AI Response:", JSON.stringify(response));

            return this.parseAIQuestionResponse(response);
        } catch (aiError) {
            console.error("QuestionSelector: AI selection failed, falling back to random:", aiError);
            return this.fallbackRandomSelection(pool);
        }
    }

    /**
     * Parse AI response to extract question IDs
     */
    private parseAIQuestionResponse(response: any): string[] {
        let questionIds: string[] = [];
        let responseText = "[]";

        if (response && response.response) {
            responseText = response.response.trim();
        }

        const cleanResponse = responseText.replace(/```json|```/g, '').trim();
        try {
            questionIds = JSON.parse(cleanResponse);
            if (!Array.isArray(questionIds)) {
                questionIds = [cleanResponse.replace(/['"]/g, '')];
            }
            questionIds = questionIds.slice(0, 3);
        } catch (parseError) {
            questionIds = [cleanResponse.replace(/['"]/g, '').trim()];
        }

        return questionIds;
    }

    /**
     * Fallback: select random questions if AI fails
     */
    private fallbackRandomSelection(pool: Problem[]): string[] {
        const questionIds: string[] = [];
        if (pool.length > 0) {
            const count = Math.min(2, pool.length);
            for (let i = 0; i < count; i++) {
                questionIds.push(pool[Math.floor(Math.random() * pool.length)].questionId);
            }
        }
        return questionIds;
    }
}
