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
