
export class VoiceAgent {
    private ai: any;

    constructor(ai: any) {
        this.ai = ai;
    }

    async processAudio(audioBuffer: ArrayBuffer, context: string, systemPrompt: string): Promise<{ userTranscript: string; aiResponse: string; audio: ArrayBuffer }> {
        // 1. Transcribe Audio (STT)
        const transcription = await this.transcribeAudio(audioBuffer);
        console.log("VoiceAgent: Transcription:", transcription);

        // 2. Generate AI Response (LLM)
        const aiResponseText = await this.generateResponse(transcription, context, systemPrompt);
        console.log("VoiceAgent: AI Response:", aiResponseText);

        // 3. Generate Audio (TTS)
        const audioResponse = await this.generateAudio(aiResponseText);

        return {
            userTranscript: transcription,
            aiResponse: aiResponseText,
            audio: audioResponse
        };
    }

    private async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
        try {
            // Convert ArrayBuffer to Uint8Array for the model
            const input = new Uint8Array(audioBuffer);

            const response = await this.ai.run("@cf/openai/whisper", {
                audio: [...input]
            });

            return response.text || "";
        } catch (error) {
            console.error("VoiceAgent: STT Error:", error);
            throw new Error("Failed to transcribe audio");
        }
    }

    private async generateResponse(userInput: string, context: string, systemPrompt: string): Promise<string> {
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Context: ${context}\n\nUser: ${userInput}` }
            ];

            const response = await this.ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                messages,
                max_tokens: 256 // Keep responses concise for voice
            });

            return response.response || "I didn't catch that. Could you repeat?";
        } catch (error) {
            console.error("VoiceAgent: LLM Error:", error);
            return "I'm having trouble thinking right now. Please try again.";
        }
    }

    private async generateAudio(text: string): Promise<ArrayBuffer> {
        try {
            // Trying a standard TTS model available in Cloudflare Workers AI
            // If this specific model isn't available, we might need to swap it.
            // @cf/deepgram/aura-asteria-en is a common one for conversational AI
            const response = await this.ai.run("@cf/deepgram/aura-2-es", {
                text: text
            });

            // Response is usually a ReadableStream or ArrayBuffer
            // We need to ensure we return an ArrayBuffer
            if (response instanceof ReadableStream) {
                return await new Response(response).arrayBuffer();
            }
            return response;
        } catch (error) {
            console.error("VoiceAgent: TTS Error:", error);
            // Fallback: Return empty buffer or throw
            throw new Error("Failed to generate audio");
        }
    }
}
