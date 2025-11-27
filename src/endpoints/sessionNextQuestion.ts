import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export class SessionNextQuestion extends OpenAPIRoute {
	schema = {
		tags: ["Interview Sessions"],
		summary: "Get the next question in an interview session",
		request: {
			params: z.object({
				sessionId: z.string({
					description: "The session ID"
				})
			})
		},
		responses: {
			"200": {
				description: "Returns the next question and session state",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							question: z.object({
								questionId: z.string(),
								type: z.string(),
								category: z.string(),
								difficulty: z.string(),
								title: z.string(),
								text: z.string(),
								estimatedTime: z.number(),
								hints: z.array(z.string()),
								followUpQuestions: z.array(z.string())
							}).optional(),
							session: z.object({
								currentQuestionIndex: z.number(),
								remainingQuestions: z.number(),
								estimatedTimeRemaining: z.number()
							}),
							hasMore: z.boolean()
						})
					}
				}
			},
			"404": {
				description: "Session not found",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							error: z.object({
								code: z.string(),
								message: z.string(),
								timestamp: z.string()
							})
						})
					}
				}
			}
		}
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { sessionId } = data.params;

		try {
			// TODO: Get session data from Durable Object
			// For now, return a mock response
			const mockQuestion = {
				questionId: "q_123",
				type: "coding",
				category: "algorithms",
				difficulty: "medium",
				title: "Two Sum",
				text: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
				estimatedTime: 15,
				hints: ["Use hash map for O(1) lookup", "Consider complement values"],
				followUpQuestions: ["What's the space complexity?", "How to handle duplicates?"]
			};

			return {
				success: true,
				question: mockQuestion,
				session: {
					currentQuestionIndex: 1,
					remainingQuestions: 5,
					estimatedTimeRemaining: 75
				},
				hasMore: true
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: "SESSION_NOT_FOUND",
					message: `Session ${sessionId} not found`,
					timestamp: new Date().toISOString()
				}
			};
		}
	}
}