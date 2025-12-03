import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";
import { VoiceAgent } from "../services/voice-agent";

export class VoiceChat extends OpenAPIRoute {
    schema = {
        tags: ["Interview Sessions"],
        summary: "Process voice chat",
        request: {
            params: z.object({
                sessionId: z.string()
            }),
            body: {
                content: {
                    "application/octet-stream": {
                        schema: z.instanceof(ArrayBuffer)
                    }
                }
            }
        },
        responses: {
            "200": {
                description: "Returns audio response",
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
        const contentType = c.req.header("content-type");
        const { SESSION_NAMESPACE, AI } = c.env as any;

        try {
            // 1. Get Session Context - Get Durable Object stub directly
            const id = SESSION_NAMESPACE.idFromName(sessionId);
            const sessionStub = SESSION_NAMESPACE.get(id);

            // Fetch current state/question
            const currentQuestionRes = await sessionStub.fetch("http://internal/question/current");
            const currentQuestionData = await currentQuestionRes.json() as any;
            const currentQuestion = currentQuestionData.question;

            console.log("VoiceChat: Current question data:", JSON.stringify(currentQuestion, null, 2));

            const voiceAgent = new VoiceAgent(AI);
            let result: { userTranscript: string; aiResponse: string; audio: ArrayBuffer };

            if (contentType === "application/json") {
                // Handle JSON input (e.g., Greeting or Text Chat)
                const body = await c.req.json();

                if (body.action === "greeting") {
                    // Generate Greeting
                    let context = "You are Alex, a senior technical recruiter at a top tech company. This is the start of the interview.";

                    if (currentQuestion) {
                        context += `\nThe first question will be: ${currentQuestion.title}.`;
                        context += "\nGoal: Introduce yourself briefly, welcome the candidate, and transition smoothly into the first question. Simulate a real interview.";
                    } else {
                        context += "\nGoal: Introduce yourself briefly, welcome the candidate, and start a general behavioral interview. Simulate a real interview.";
                    }

                    const systemPrompt = "You are Alex, a professional and real technical interviewer. Introduce yourself and welcome the candidate. Keep it under 2 sentences. Simulate a real interview.";

                    const messages = [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Context: ${context}\n\nTask: Start the interview.` }
                    ];

                    const llmResponse = await AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                        messages,
                        max_tokens: 300
                    });

                    const greetingText = llmResponse.response || "Hello! I'm Alex. Ready to start?";
                    console.log("Greeting Text: ", greetingText);
                    // Generate Audio
                    const audioResponse = await AI.run("@cf/deepgram/aura-2-es", {
                        text: greetingText
                    });

                    let audioBuffer: ArrayBuffer;
                    if (audioResponse instanceof ReadableStream) {
                        audioBuffer = await new Response(audioResponse).arrayBuffer();
                    } else {
                        audioBuffer = audioResponse;
                    }

                    console.log("Audio Buffer: ", audioBuffer);

                    result = {
                        userTranscript: "[Session Started]",
                        aiResponse: greetingText,
                        audio: audioBuffer
                    };
                } else if (body.message) {
                    // Handle text-based chat message (post-interview or during interview)
                    const chatResponse = await sessionStub.fetch("http://internal/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: body.message, code: body.code })
                    });

                    const chatData = await chatResponse.json() as any;

                    // Return JSON response for text chat
                    return c.json({
                        success: true,
                        response: chatData.response,
                        session: chatData.session
                    });
                } else {
                    return c.json({ success: false, error: "Invalid action" }, 400);
                }
            } else {
                // Handle Audio Input
                const audioBuffer = await c.req.arrayBuffer();

                // 2. Prepare Context
                let context = "You are Alex, a senior technical recruiter at a top tech company.";

                // Add Interview Mode Context
                const sessionState = await sessionStub.fetch("http://internal/state").then(r => r.json() as any);
                const currentCode = sessionState.session?.currentCode || sessionState.currentCode || "";
                console.log("VoiceChat: Current code length:", currentCode.length);
                console.log("VoiceChat: Current code preview:", currentCode.substring(0, 200));
                const interviewMode = sessionState.session?.mode || sessionState.mode || "technical";
                const jobDescription = sessionState.session?.jobDescription || sessionState.jobDescription || "";
                const seniority = sessionState.session?.seniority || sessionState.seniority || "";

                context += `\nInterview Mode: ${interviewMode.toUpperCase()}`;
                if (seniority) context += `\nTarget Seniority: ${seniority}`;
                if (jobDescription) context += `\nJob Description Context: ${jobDescription.substring(0, 300)}...`;

                if (currentQuestion) {
                    context += `\nCurrent Question: ${currentQuestion.title}\n${currentQuestion.text}`;

                    if (interviewMode === 'technical') {
                        if (currentCode && currentCode.length > 0) {
                            context += `\n\nCandidate's Current Code:\n\`\`\`${currentQuestion.language || 'javascript'}\n${currentCode}\n\`\`\``;
                            context += "\nGoal: Guide the candidate through this technical problem. You can also ask theoretical questions related to the concepts used, or behavioral questions about their past experience with these technologies. Don't give the code answer directly, but provide hints only when needed. This is a technical interview.";
                        } else {
                            context += "\n\nThe candidate hasn't written any code yet.";
                            context += "\nGoal: Guide the candidate through this technical problem. You can also ask theoretical questions related to the concepts used, or behavioral questions about their past experience with these technologies. Don't give the code answer directly, but provide hints only when needed. This is a technical interview.";
                        }
                    } else {
                        context += "\nGoal: This is a behavioral interview based on a specific scenario. Ask questions that will help you understand the candidate's past experience. Simulate a real interview.";
                    }
                } else {
                    context += "\nNo specific question selected. Conduct a general behavioral interview.";
                    context += "\nGoal: Assess the candidate's soft skills and past experience. Simulate a real interview.";
                }

                // 3. Process Voice
                result = await voiceAgent.processAudio(
                    audioBuffer,
                    context,
                    "You are Alex, a professional and friendly technical interviewer. Your goal is to assess the candidate holistically (technical + behavioral). Keep your responses concise (under 3 sentences) and conversational. Always ask a follow-up question or provide a clear next step."
                );
            }

            // 4. Update Session (Async)
            sessionStub.fetch("http://internal/add-interaction", {
                method: "POST",
                body: JSON.stringify({
                    userText: result.userTranscript,
                    aiText: result.aiResponse
                })
            });

            // 5. Return Audio
            return new Response(result.audio, {
                headers: {
                    "Content-Type": "audio/mpeg",
                    "X-Transcript": result.aiResponse
                }
            });

        } catch (error) {
            console.error("VoiceChat: Error:", error);
            return c.json({ success: false, error: "Voice processing failed" }, 500);
        }
    }
}
