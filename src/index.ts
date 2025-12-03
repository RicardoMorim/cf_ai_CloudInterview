import { fromHono } from "chanfana";
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { SessionCreate } from "./endpoints/sessionCreate";
import { SessionNextQuestion } from "./endpoints/sessionNextQuestion";
import { VoiceChat } from "./endpoints/voiceChat";
import { CodeRun } from "./endpoints/codeRun";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply middleware
app.use('*', corsMiddleware);
app.use('*', errorHandler);

// Log requests for debugging
app.use('*', async (c, next) => {
  console.log(`${c.req.method} request:`, c.req.url);
  await next();
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
});


// Interview Session endpoints
openapi.post("/api/sessions", SessionCreate);
openapi.get("/api/sessions/:sessionId/question/next", SessionNextQuestion);
openapi.post("/api/sessions/:sessionId/chat", VoiceChat);
openapi.post("/api/code/run", CodeRun);



// Example endpoint demonstrating Cloudflare Workers AI integration
app.post("/api/ai/generate", async (c) => {
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
app.post("/api/kv/put", async (c) => {
  const { key, value } = await c.req.json();

  // Use the correct KV pattern
  await c.env.KV.put(key, JSON.stringify(value));

  return c.json({
    success: true,
    message: "Value stored successfully"
  });
});

app.get("/api/kv/get/:key", async (c) => {
  const key = c.req.param("key");

  // Use the correct KV pattern
  const value = await c.env.KV.get(key, "json");

  return c.json({
    success: true,
    data: value
  });
});

// Interview Session endpoints
// Interview Session endpoints
openapi.post("/api/sessions", SessionCreate);
openapi.get("/api/sessions/:sessionId/question/next", SessionNextQuestion);

// Submit Answer Endpoint
// Submit Answer Endpoint - Proxy to Durable Object
app.post("/api/sessions/:sessionId/answer", async (c) => {
  const sessionId = c.req.param("sessionId");
  const body = await c.req.json();

  const id = c.env.SESSION_NAMESPACE.idFromName(sessionId);
  const stub = c.env.SESSION_NAMESPACE.get(id);

  return stub.fetch("http://internal/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
});

// End Session Endpoint
app.post("/api/sessions/:sessionId/end", async (c) => {
  const sessionId = c.req.param("sessionId");
  const id = c.env.SESSION_NAMESPACE.idFromName(sessionId);
  const stub = c.env.SESSION_NAMESPACE.get(id);

  return stub.fetch("http://internal/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
});

// Chat Endpoint (Post-Interview)
app.post("/api/sessions/:sessionId/chat", async (c) => {
  const sessionId = c.req.param("sessionId");
  const body = await c.req.json();

  const id = c.env.SESSION_NAMESPACE.idFromName(sessionId);
  const stub = c.env.SESSION_NAMESPACE.get(id);

  return stub.fetch("http://internal/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
});

// Get Session State Endpoint
app.get("/api/sessions/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");
  const id = c.env.SESSION_NAMESPACE.idFromName(sessionId);
  const stub = c.env.SESSION_NAMESPACE.get(id);
  return stub.fetch("http://internal/state");
});

// Update Session State Endpoint
app.post("/api/sessions/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");
  const body = await c.req.json();
  const id = c.env.SESSION_NAMESPACE.idFromName(sessionId);
  const stub = c.env.SESSION_NAMESPACE.get(id);
  return stub.fetch("http://internal/update-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
});

// Generate Question Endpoint (Helper)
app.post("/api/interview/generate-question", async (c) => {
  const { jobType, difficulty, questionType } = await c.req.json();

  const prompt = `Generate a ${difficulty} level ${questionType} interview question for a ${jobType} position. Return as JSON with structure: { "question": "...", "answer": "...", "explanation": "...", "hints": ["hint1", "hint2"] }`;

  const response = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    prompt,
    temperature: 0.7,
    max_tokens: 800
  });

  let questionData;
  try {
    let responseText = "";
    if (typeof response === "string") {
      responseText = response;
    } else if (response && typeof response === "object" && "response" in response) {
      responseText = (response as any).response;
    }

    const cleanResponse = responseText.replace(/```json|```/g, '').trim();
    questionData = JSON.parse(cleanResponse);
  } catch (error) {
    return c.json({
      success: false,
      error: "Failed to generate valid question"
    }, 500);
  }

  const questionId = `gen_${Date.now()}`;
  const question = {
    questionId,
    type: questionType,
    category: jobType,
    difficulty,
    title: "Generated Question",
    text: questionData.question,
    hints: questionData.hints || []
  };

  return c.json({
    success: true,
    data: question
  });
});

// Speech Recognition Endpoint
app.post("/api/ai/transcribe", async (c) => {
  try {
    const formData = await c.req.parseBody();
    const audioFile = formData['audio'];

    if (!audioFile || !(audioFile instanceof File)) {
      return c.json({ success: false, error: "No audio file provided" }, 400);
    }

    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioUint8Array = new Uint8Array(audioArrayBuffer);

    // Run Whisper model
    const response = await c.env.AI.run("@cf/openai/whisper", {
      audio: [...audioUint8Array]
    });

    return c.json({
      success: true,
      data: {
        text: response.text
      }
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

// Health check endpoint
app.get("/health", async (c) => {
  try {
    // Test AI connection with Llama 3.3
    const aiTest = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: "Hello",
      max_tokens: 5
    });

    // Test KV connection
    await c.env.KV.put("health_check", "ok");
    const kvTest = await c.env.KV.get("health_check");

    return c.json({
      success: true,
      data: {
        status: "healthy",
        services: {
          ai: aiTest ? "connected" : "disconnected",
          kv: kvTest === "ok" ? "connected" : "disconnected"
        }
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: "Health check failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 503);
  }
});


// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;

// Export Durable Objects
export { InterviewSessionDO as Session } from "./services/session-management";


