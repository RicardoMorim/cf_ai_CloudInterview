import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";
import { SessionManager } from "../services/session-management";
import { VoiceAgent } from "../services/voice-agent";
import { AIResponseType, Sentiment } from "../types";

export class SessionGreeting extends OpenAPIRoute {
    schema = {
        tags: ["Interview Sessions"],
        summary: "Generate initial interview greeting",
        request: {
            params: z.object({
                sessionId: z.string()
            })
        },
        responses: {
            "200": {
                description: "Returns audio greeting",
                content: {
                    "audio/mpeg": {
                        schema: z.instanceof(ArrayBuffer)
                    }
                },
                headers: z.object({
                    "X-Transcript": z.string().optional()
                })
            },
            "404": {
                description: "Session not found"
            },
            "500": {
                description: "Server error"
            }
        }
    };

    async handle(c: AppContext) {
        const { sessionId } = c.req.param();
        const { SESSION_NAMESPACE, AI } = c.env as any;

        try {
            // 1. Get Session Context
            const sessionManager = new SessionManager(SESSION_NAMESPACE);
            const sessionStub = sessionManager.getSessionStub(sessionId);

            // Fetch current state/question
            const currentQuestionRes = await sessionStub.fetch("http://internal/question/current");
            const currentQuestionData = await currentQuestionRes.json() as any;
            const currentQuestion = currentQuestionData.question;

            // 2. Prepare Context for Greeting
            let context = "You are Alex, a senior technical recruiter at a top tech company. This is the start of the interview.";
            if (currentQuestion) {
                context += `\nThe first question will be: ${currentQuestion.title}.`;
                context += "\nGoal: Introduce yourself briefly, welcome the candidate, and transition smoothly into the first question.";
            } else {
                context += "\nGoal: Introduce yourself briefly, welcome the candidate, and start a general behavioral interview.";
            }

            // 3. Generate Greeting
            const voiceAgent = new VoiceAgent(AI);
            // We pass an empty buffer or a special signal. 
            // Actually VoiceAgent.processAudio expects audio. 
            // We should add a method to VoiceAgent for text-only input or just generate text then audio.

            // Let's do it manually here for now to avoid changing VoiceAgent interface too much,
            // or better, add generateAudioResponse(text, context, systemPrompt) to VoiceAgent.

            // For now, I'll use the AI directly here or extend VoiceAgent.
            // Extending VoiceAgent is cleaner.

            // Let's assume I'll add `generateGreeting` to VoiceAgent.
            // But I can't easily edit VoiceAgent right now without another step.
            // I'll just implement the logic here using the AI binding.

            const systemPrompt = "You are Alex, a professional and friendly technical interviewer. Introduce yourself and welcome the candidate. Keep it under 2 sentences. Be encouraging.";

            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Context: ${context}\n\nTask: Generate a welcome message.` }
            ];

            const llmResponse = await AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                messages,
                max_tokens: 150
            });

            const greetingText = llmResponse.response || "Hello! I'm Alex. Ready to start?";

            // Generate Audio
            const audioResponse = await AI.run("@cf/deepgram/aura-asteria-en", {
                text: greetingText
            });

            let audioBuffer: ArrayBuffer;
            if (audioResponse instanceof ReadableStream) {
                audioBuffer = await new Response(audioResponse).arrayBuffer();
            } else {
                audioBuffer = audioResponse;
            }

            // 4. Update Session (Async)
            sessionStub.fetch("http://internal/add-interaction", {
                method: "POST",
                body: JSON.stringify({
                    userText: "[Session Started]",
                    aiText: greetingText
                })
            });

            // 5. Return Audio
            return new Response(audioBuffer, {
                headers: {
                    "Content-Type": "audio/mpeg",
                    "X-Transcript": greetingText
                }
            });

        } catch (error) {
            console.error("SessionGreeting: Error:", error);
            return c.json({ success: false, error: "Greeting generation failed" }, 500);
        }
    }
}
