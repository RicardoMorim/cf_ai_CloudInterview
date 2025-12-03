import { fromHono } from "chanfana";
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { SessionCreate } from "./endpoints/sessionCreate";
import { SessionNextQuestion } from "./endpoints/sessionNextQuestion";
import { VoiceChat } from "./endpoints/voiceChat";
import { CodeRun } from "./endpoints/codeRun";
import examples from "./examples/examples";

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

// ===================
// PRODUCTION API ROUTES
// ===================

// Interview Session endpoints
openapi.post("/api/sessions", SessionCreate);
openapi.get("/api/sessions/:sessionId/question/next", SessionNextQuestion);
openapi.post("/api/sessions/:sessionId/chat", VoiceChat);
openapi.post("/api/code/run", CodeRun);

// Session state update (for tracking code changes)
app.post("/api/sessions/:sessionId/state", async (c) => {
  const { sessionId } = c.req.param();
  const body = await c.req.json() as any;

  try {
    const { SESSION_NAMESPACE } = c.env as any;
    const id = SESSION_NAMESPACE.idFromName(sessionId);
    const stub = SESSION_NAMESPACE.get(id);

    // Update state in the Durable Object
    const response = await stub.fetch("http://internal/update-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    return response;
  } catch (error) {
    console.error("State update error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update state"
    }, 500);
  }
});

// Get session state
app.get("/api/sessions/:sessionId/state", async (c) => {
  const { sessionId } = c.req.param();

  try {
    const { SESSION_NAMESPACE } = c.env as any;
    const id = SESSION_NAMESPACE.idFromName(sessionId);
    const stub = SESSION_NAMESPACE.get(id);

    // Get state from the Durable Object
    const response = await stub.fetch("http://internal/state", {
      method: "GET"
    });

    return response;
  } catch (error) {
    console.error("State retrieval error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get state"
    }, 500);
  }
});

// Answer submission (for submitting code/answers)
app.post("/api/sessions/:sessionId/answer", async (c) => {
  const { sessionId } = c.req.param();
  const body = await c.req.json() as any;

  try {
    const { SESSION_NAMESPACE } = c.env as any;
    const id = SESSION_NAMESPACE.idFromName(sessionId);
    const stub = SESSION_NAMESPACE.get(id);

    // Submit answer to the Durable Object
    const response = await stub.fetch("http://internal/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    return response;
  } catch (error) {
    console.error("Answer submission error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit answer"
    }, 500);
  }
});

// End interview session
app.post("/api/sessions/:sessionId/end", async (c) => {
  const { sessionId } = c.req.param();

  try {
    const { SESSION_NAMESPACE } = c.env as any;
    const id = SESSION_NAMESPACE.idFromName(sessionId);
    const stub = SESSION_NAMESPACE.get(id);

    // End the session in the Durable Object
    const response = await stub.fetch("http://internal/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    return response;
  } catch (error) {
    console.error("Session end error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to end session"
    }, 500);
  }
});

// ===================
// EXAMPLE/DEMO ENDPOINTS
// ===================

// Mount example endpoints (for testing/demonstration)
app.route("/", examples);

// ===================
// HEALTH CHECK
// ===================

app.get("/health", async (c) => {
  try {
    // Test AI connection
    const aiTest = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: "Hello",
      max_tokens: 5
    });

    // Test KV connection
    const kvTest = await c.env.KV.get("health-check");

    return c.json({
      status: "healthy",
      services: {
        ai: aiTest ? "ok" : "error",
        kv: "ok"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Export the Hono app
export default app;

// Export Durable Objects
export { InterviewSessionDO as Session } from "./services/session-management";
