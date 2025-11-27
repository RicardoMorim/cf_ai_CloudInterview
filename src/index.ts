import { fromHono } from "chanfana";
import { Hono } from "hono";
import { TaskCreate } from "./endpoints/taskCreate";
import { TaskDelete } from "./endpoints/taskDelete";
import { TaskFetch } from "./endpoints/taskFetch";
import { TaskList } from "./endpoints/taskList";
import { SessionCreate } from "./endpoints/sessionCreate";
import { SessionNextQuestion } from "./endpoints/sessionNextQuestion";

// Interview Session Durable Object
export class InterviewSessionDO {
  private state: DurableObjectState;
  private sessionData: Record<string, any>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessionData = {};
    
    // Set up storage
    this.state.blockConcurrencyWhile(async () => {
      this.sessionData = await this.state.storage.get("session") || {};
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = this.state.id.toString();
    
    if (url.pathname === "/session") {
      if (request.method === "GET") {
        return new Response(JSON.stringify(this.sessionData), {
          headers: { "Content-Type": "application/json" }
        });
      } else if (request.method === "POST") {
        const data = await request.json();
        this.sessionData = { ...this.sessionData, ...(data as Record<string, any>) };
        await this.state.storage.put("session", this.sessionData);
        return new Response(JSON.stringify({ success: true, sessionId }));
      }
    }
    
    return new Response("Interview Session DO", { status: 200 });
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.state.storage.get(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.state.storage.put(key, value);
  }
}

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});


// Interview Session endpoints
openapi.post("/api/sessions", SessionCreate);
openapi.get("/api/sessions/:sessionId/question/next", SessionNextQuestion);

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

// Example endpoint demonstrating both AI and KV working together
app.post("/api/interview/generate-question", async (c) => {
  const { jobType, difficulty, questionType } = await c.req.json();
  
  // Generate question using Llama 3.3
  const prompt = `Generate a ${difficulty} level ${questionType} interview question for a ${jobType} position. Return as JSON with structure: { "question": "...", "answer": "...", "explanation": "..." }`;
  
  const response = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    prompt,
    temperature: 0.7,
    max_tokens: 800
  });
  
  let questionData;
  try {
    // Handle the response properly
    let responseText = "";
    if (typeof response === "string") {
      responseText = response;
    } else if (response && typeof response === "object" && "response" in response) {
      responseText = (response as any).response;
    }
    
    // Clean the response and parse JSON
    const cleanResponse = responseText.replace(/```json|```/g, '').trim();
    questionData = JSON.parse(cleanResponse);
  } catch (error) {
    return c.json({
      success: false,
      error: "Failed to generate valid question"
    }, 500);
  }
  
  // Store generated question in KV
  const questionId = `generated_${Date.now()}`;
  const question = {
    questionId,
    type: questionType,
    category: jobType,
    difficulty,
    title: "Generated Question",
    text: questionData.question,
    answer: questionData.answer,
    explanation: questionData.explanation,
    tags: [jobType, questionType, difficulty],
    estimatedTime: 10,
    followUpQuestions: [],
    hints: [],
    metadata: {
      difficultyWeight: 1,
      popularity: 0,
      lastUpdated: new Date().toISOString(),
      relatedQuestions: [],
      source: "AI_GENERATED"
    }
  };
  
  await c.env.KV.put(`question:${questionId}`, JSON.stringify(question));
  
  return c.json({
    success: true,
    data: question
  });
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
