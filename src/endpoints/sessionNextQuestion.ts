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
			const id = c.env.SESSION_NAMESPACE.idFromName(sessionId);
			const stub = c.env.SESSION_NAMESPACE.get(id);

			const response = await stub.fetch("http://internal/next");

			if (!response.ok) {
				throw new Error("Failed to fetch next question");
			}

			const result = await response.json() as any;

			return {
				success: true,
				question: result.question,
				session: {
					currentQuestionIndex: result.session.currentQuestionIndex,
					remainingQuestions: result.session.questions.length - result.session.currentQuestionIndex,
					estimatedTimeRemaining: 30 // Estimate
				},
				hasMore: result.question !== null
			};
		} catch (error) {
			return {
				success: false,
				error: {
					code: "SESSION_ERROR",
					message: error instanceof Error ? error.message : "Failed to get next question",
					timestamp: new Date().toISOString()
				}
			};
		}
	}
}