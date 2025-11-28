import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";

export class CodeRun extends OpenAPIRoute {
    schema = {
        tags: ["Code Execution"],
        summary: "Simulate code execution",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            code: z.string(),
                            language: z.string()
                        })
                    }
                }
            }
        },
        responses: {
            "200": {
                description: "Returns execution output",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            output: z.string(),
                            error: z.string().optional()
                        })
                    }
                }
            },
            "500": {
                description: "Server error"
            }
        }
    };

    async handle(c: AppContext) {
        const { code, language } = await c.req.json();
        const { AI } = c.env as any;

        try {
            const prompt = `
            You are a code execution engine. Your task is to simulate the execution of the following ${language} code and return the output exactly as it would appear in the console.
            
            Rules:
            1. If the code runs successfully, return ONLY the output (stdout).
            2. If there are syntax errors or runtime exceptions, return the error message.
            3. Do not add any markdown formatting, explanations, or "Here is the output" text. Just the raw output.
            4. If the code has no output, return "<No Output>".
            
            Code:
            ${code}
            `;

            const response = await AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                prompt,
                temperature: 0.1, // Low temperature for deterministic output
                max_tokens: 500
            });

            let output = "";
            if (typeof response === "string") {
                output = response;
            } else if (response && typeof response === "object" && "response" in response) {
                output = (response as any).response;
            }

            return c.json({
                success: true,
                output: output.trim()
            });

        } catch (error) {
            console.error("CodeRun: Error:", error);
            return c.json({ success: false, error: "Execution failed" }, 500);
        }
    }
}
