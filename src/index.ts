import { fromHono } from "chanfana";
import { Hono } from "hono";
import { SessionCreate } from "./endpoints/sessionCreate";
import { SessionNextQuestion } from "./endpoints/sessionNextQuestion";
import { VoiceChat } from "./endpoints/voiceChat";
import { CodeRun } from "./endpoints/codeRun";



// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware to all routes - simplified approach
app.use('*', async (c, next) => {
  // Always set CORS headers for every request
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Transcript',
    'Access-Control-Max-Age': '86400'
  };

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    // Log preflight request for debugging
    console.log('OPTIONS request received:', c.req.url);
    console.log('Request headers:', c.req.header);

    return new Response(null, {
      status: 204,
      headers: headers
    });
  }

  // Log actual requests for debugging
  console.log(`${c.req.method} request:`, c.req.url);

  // Set headers for actual requests
  Object.entries(headers).forEach(([key, value]) => {
    c.res.headers.set(key, value);
  });

  // Continue to the actual route handler
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
app.post("/api/sessions/:sessionId/answer", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { answerText, codeSubmission, responseTime } = await c.req.json();

  // 1. Retrieve Session
  const sessionStr = await c.env.KV.get(`session:${sessionId}`);
  if (!sessionStr) {
    return c.json({ success: false, error: "Session not found" }, 404);
  }
  const session = JSON.parse(sessionStr);

  // 2. Get Current Question
  const currentQuestion = session.questions[session.currentQuestionIndex];

  // 3. Evaluate Answer with AI
  const evaluationPrompt = `
    You are an expert technical interviewer. Evaluate the candidate's answer to the following question.
    
    Question: ${currentQuestion.text}
    Type: ${currentQuestion.type}
    Difficulty: ${currentQuestion.difficulty}
    
    Candidate Answer: ${answerText}
    ${codeSubmission ? `Candidate Code (${codeSubmission.language}):\n${codeSubmission.code}` : ''}
    
    Provide a JSON response with:
    - feedback: Constructive feedback to the candidate (speak directly to them).
    - score: 0-100 score.
    - sentiment: "positive", "neutral", or "negative".
    - followUp: true/false if a follow-up is needed.
    - nextQuestionType: Suggest the type of the next question (or "completion" if done).
  `;

  let evaluation;
  try {
    const aiResponse = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: evaluationPrompt,
      temperature: 0.3,
      max_tokens: 1000
    });

    let responseText = "";
    if (typeof aiResponse === "string") {
      responseText = aiResponse;
    } else if (aiResponse && typeof aiResponse === "object" && "response" in aiResponse) {
      responseText = (aiResponse as any).response;
    }

    const cleanResponse = responseText.replace(/```json|```/g, '').trim();
    evaluation = JSON.parse(cleanResponse);
  } catch (e) {
    console.error("AI Evaluation failed", e);
    evaluation = {
      feedback: "Thank you for your answer. Let's move on.",
      score: 70,
      sentiment: "neutral",
      followUp: false
    };
  }

  // 4. Update Session State
  const answerId = `ans_${Date.now()}`;
  const answer = {
    answerId,
    sessionId,
    questionId: currentQuestion.questionId,
    answerText,
    codeSubmission,
    submittedAt: new Date().toISOString(),
    responseTime,
    evaluation
  };

  session.answers.push(answer);

  // 5. Determine Next Step
  let nextAction;
  if (session.answers.length >= 5) { // Limit to 5 questions for now
    nextAction = { type: "completion" };
    session.status = "completed";
  } else {
    // Increment index for next question
    session.currentQuestionIndex++;
    nextAction = { type: "question" };

    // If we need to generate the next question immediately, we could do it here
    // For now, the client will call /next to get it
  }

  await c.env.KV.put(`session:${sessionId}`, JSON.stringify(session));

  return c.json({
    success: true,
    data: {
      session,
      aiResponse: {
        responseId: `resp_${Date.now()}`,
        sessionId,
        type: "feedback",
        content: evaluation.feedback,
        generatedAt: new Date().toISOString(),
        sentiment: evaluation.sentiment,
        followUp: evaluation.followUp
      },
      nextAction
    }
  });
});

// End Session Endpoint
app.post("/api/sessions/:sessionId/end", async (c) => {
  const sessionId = c.req.param("sessionId");

  const sessionStr = await c.env.KV.get(`session:${sessionId}`);
  if (!sessionStr) {
    return c.json({ success: false, error: "Session not found" }, 404);
  }
  const session = JSON.parse(sessionStr);

  session.status = "completed";
  session.completedAt = new Date().toISOString();

  // Generate Final Feedback
  const summaryPrompt = `
    Generate a final interview summary for the candidate based on these answers:
    ${JSON.stringify(session.answers.map((a: any) => ({ q: a.questionId, a: a.answerText, score: a.evaluation?.score })))}
    
    Return JSON:
    - overallScore: 0-100
    - summary: Executive summary of performance.
    - strengths: List of strings.
    - improvements: List of strings.
    - recommendation: "Hire", "No Hire", "Strong Hire", "Leaning No Hire".
  `;

  let finalFeedback;
  try {
    const aiResponse = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      prompt: summaryPrompt,
      temperature: 0.4,
      max_tokens: 1500
    });

    let responseText = "";
    if (typeof aiResponse === "string") {
      responseText = aiResponse;
    } else if (aiResponse && typeof aiResponse === "object" && "response" in aiResponse) {
      responseText = (aiResponse as any).response;
    }

    const cleanResponse = responseText.replace(/```json|```/g, '').trim();
    finalFeedback = JSON.parse(cleanResponse);
  } catch (e) {
    finalFeedback = {
      overallScore: 75,
      summary: "Interview completed.",
      strengths: [],
      improvements: [],
      recommendation: "Hire"
    };
  }

  session.feedback = finalFeedback;
  await c.env.KV.put(`session:${sessionId}`, JSON.stringify(session));

  return c.json({
    success: true,
    data: {
      session,
      feedback: finalFeedback
    }
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
