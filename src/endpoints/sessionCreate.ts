import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";

export class SessionCreate extends OpenAPIRoute {
	schema = {
		tags: ["Interview Sessions"],
		summary: "Start a new interview session",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							mode: z.enum(["technical", "behavioral", "mixed"], {
								description: "Interview mode"
							}),
							jobType: z.string({
								description: "Target job role (e.g., 'Senior Software Engineer')"
							}),
							difficulty: z.enum(["easy", "medium", "hard", "expert"]).optional().default("medium"),
							duration: z.number().optional().default(45),
							language: z.string().optional().default("javascript"),
							includeCoding: z.boolean().optional().default(true),
							topics: z.array(z.string()).optional().default([]),
							jobDescription: z.string().optional(),
							seniority: z.enum(["junior", "mid", "senior", "lead", "principal"]).optional()
						})
					}
				}
			}
		},
		responses: {
			"200": {
				description: "Returns the created interview session",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							session: z.any(), // Allow full session object including questions
							nextAction: z.object({
								type: z.string(),
								message: z.string(),
								estimatedTime: z.number()
							})
						})
					}
				}
			},
			"400": {
				description: "Invalid request parameters",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							error: z.object({
								code: z.string(),
								message: z.string(),
								details: z.any().optional(),
								timestamp: z.string()
							})
						})
					}
				}
			}
		}
	};

	async handle(c: AppContext) {
		// Get validated data
		const data = await this.getValidatedData<typeof this.schema>();
		const { mode, jobType, difficulty, duration, language, includeCoding, topics, jobDescription, seniority } = data.body;

		// Get Durable Object namespace
		const { SESSION_NAMESPACE } = c.env as any;

		try {
			// TODO: Get user from auth (placeholder for now)
			const userId = "user_123";

			console.log("SessionCreate: Creating session via Durable Object");

			// Create unique session ID and get Durable Object stub
			const sessionId = crypto.randomUUID();
			const id = SESSION_NAMESPACE.idFromName(sessionId);
			const stub = SESSION_NAMESPACE.get(id);

			// Call startSession on the Durable Object
			const sessionResponse = await stub.fetch("http://internal/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					mode,
					jobType,
					difficulty,
					duration,
					jobDescription,
					seniority
				})
			});

			const { session } = await sessionResponse.json() as any;
			console.log("SessionCreate: Session created with ID:", sessionId);

			// We removed the blocking AI generation here.
			// The introduction will be handled by the voice agent or generated lazily.
			const introduction = `Welcome to your ${mode} interview for the ${jobType} position. I'm Alex, your AI interviewer.`;

			return {
				success: true,
				session: session,
				nextAction: {
					type: "intro",
					message: introduction,
					estimatedTime: 2
				}
			};
		} catch (error) {
			console.error("SessionCreate: Error creating session:", error);
			return {
				status: 500,
				success: false,
				error: {
					code: "SESSION_CREATION_FAILED",
					message: error instanceof Error ? error.message : "Failed to create session",
					timestamp: new Date().toISOString()
				}
			};
		}
	}
}
