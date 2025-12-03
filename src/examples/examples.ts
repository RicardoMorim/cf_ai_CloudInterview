/**
 * Example/Demo Endpoints
 * These are for testing and demonstration purposes
 */

import { Hono } from "hono";

const examples = new Hono<{ Bindings: Env }>();

// Example endpoint demonstrating Cloudflare Workers AI integration
examples.post("/api/ai/generate", async (c) => {
    const { prompt } = await c.req.json();

    // Use Llama 3.3 model with proper type handling
    const response = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt,
        temperature: 0.7,
        max_tokens: 500
    });

    // Handle the response properly - it might be a string or an object
    let responseText = "";
    let tokens = 0;

    if (typeof response === "string") {
        responseText = response;
    } else if (response && typeof response === "object" && "response" in response) {
        responseText = (response as any).response;
        tokens = (response as any).tokens || 0;
    }

    return c.json({
        success: true,
        data: {
            response: responseText,
            tokens
        }
    });
});

// Example endpoint demonstrating Cloudflare KV integration
examples.post("/api/kv/put", async (c) => {
    const { key, value } = await c.req.json();

    // Use the correct KV pattern
    await c.env.KV.put(key, JSON.stringify(value));

    return c.json({
        success: true,
        message: "Value stored successfully"
    });
});

examples.get("/api/kv/get/:key", async (c) => {
    const key = c.req.param("key");

    // Use the correct KV pattern
    const value = await c.env.KV.get(key, "json");

    return c.json({
        success: true,
        data: value
    });
});

// Speech Recognition Endpoint (Example)
examples.post("/api/ai/transcribe", async (c) => {
    try {
        const formData = await c.req.parseBody();
        const audioFile = formData['audio'];

        if (!audioFile || !(audioFile instanceof File)) {
            return c.json({
                success: false,
                error: "No audio file provided"
            }, 400);
        }

        const result: any = await c.env.AI.run("@cf/openai/whisper", {
            audio: Array.from(new Uint8Array(await audioFile.arrayBuffer()))
        });

        return c.json({
            success: true,
            text: result.text || "",
            vtt: result.vtt
        });
    } catch (error) {
        console.error("Transcription failed:", error);
        return c.json({
            success: false,
            error: "Transcription failed",
            details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
});

export default examples;
