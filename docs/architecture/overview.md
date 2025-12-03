# CloudInterview Architecture

## System Overview

CloudInterview is a full-stack AI-powered interview platform built entirely on Cloudflare's edge infrastructure. The architecture leverages Workers,  Durable Objects, KV storage, and Workers AI to provide a low-latency, scalable interview simulation experience.

---

## Architecture Diagram

![System Architecture](system-architecture.puml)

The architecture leverages Cloudflare's edge infrastructure:

**Frontend → Workers → Durable Objects → Workers AI + KV**

For detailed visual representation, see:
- [System Architecture Diagram](system-architecture.puml) - Component view
- [Class Diagram](../class%20diagram/diagram.puml) - Code structure
- [Domain Model](../domain%20model/domain.puml) - Data models
- [Sequence Diagram](../sequence-diagram/sequence_diagram.puml) - Interview flow

---

## Components

### Frontend Layer

**Technology:** React 18 + TypeScript + Vite

**Key Components:**
- **InterviewPage**: Main interview container
- **CodeEditor**: Monaco editor for coding challenges
- **VoiceInterface**: Microphone controls and audio playback
- **SessionHistory**: Timeline of Q&A interactions

**State Management:**
- React Context API for global state
- Custom hooks for feature isolation
- Service layer for API calls

**Performance:**
- React.memo for component optimization
- useCallback for stable references
- Code splitting for heavy components (Monaco)

---

### Backend Layer

**Technology:** Cloudflare Workers + Hono + TypeScript

**Routing:**
```typescript
Hono Router
├── /api/sessions (Session Create)
├── /api/sessions/:id/question/next (Next Question)
├── /api/sessions/:id/answer (Submit Answer)
├── /api/sessions/:id/chat (Voice Chat)
├── /api/sessions/:id/end (End Session)
└── /api/code/run (Code Execution)
```

**Middleware Stack:**
1. **CORS Middleware**: Handles preflight + headers
2. **Error Handler**: Centralized error handling
3. **Logger**: Request logging (development)

**Service Architecture:**
```
services/
├── ai/
│   ├── interviewer.ts    (Interview flow, intros/outros)
│   ├── evaluator.ts      (Code/behavioral evaluation)
│   └── generator.ts      (Hints, scenarios)
├── questions/
│   └── questionSelector.ts (AI-powered selection)
├── session/
│   ├── sessionState.ts   (State updates)
│   └── sessionActions.ts (Business logic)
└── session-management.ts  (Durable Object)
```

---

### Durable Objects

**Purpose:** Stateful session management

**Responsibilities:**
- Store interview session state
- Coordinate question flow
- Persist answers and responses
- Generate final feedback

**Lifecycle:**
```typescript
1. Create DO instance (new session)
2. Load state from storage
3. Process requests (answers, next question)
4. Save state after each mutation
5. Auto-cleanup after 2 hours
```

**State Schema:**
```typescript
{
  sessionId: string
  userId: string
  mode: "technical" | "behavioral"
  status: "in_progress" | "completed"
  questions: InterviewQuestion[]
  answers: InterviewAnswer[]
  aiResponses: AIResponse[]
  feedback?: InterviewFeedback
  currentQuestionIndex: number
  duration: number
}
```

---

### Workers AI Integration

**Models Used:**

1. **Llama 3.3 70B** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)
   - Question selection
   - Behavioral question generation
   - Code evaluation
   - Conversational responses
   - Final feedback generation

2. **Whisper** (`@cf/openai/whisper`)
   - Speech-to-text transcription
   - Voice input processing

**Prompt Engineering:**
- Context-aware prompts with job details
- Structured JSON responses
- Temperature tuning per use case
- Fallback handling for parsing errors

---

### KV Storage

**Data Stored:**

```
Keys:
├── "essentials" → { problems: Problem[] }  (metadata only)
├── "problem:1262" → LeetCodeProblem        (full details)
├── "problem:1931" → LeetCodeProblem
└── ... (3000+ problems)
```

**Access Patterns:**
1. Fetch "essentials" for question selection
2. Get full problem details by ID
3. Cache in Durable Object storage

**Data Size:**
- Essentials: ~500KB
- Per problem: ~10-50KB
- Total: ~100MB

---

## Data Flow

### Interview Session Flow

```
1. User starts interview
   ↓
2. Worker creates Durable Object
   ↓
3. QuestionSelector fetches from KV
   ↓
4. AI (Llama 3.3) selects questions
   ↓
5. Questions stored in DO storage
   ↓
6. First question returned to frontend
   ↓
7. User submits answer
   ↓
8. SessionActions processes answer
   ↓
9. AI evaluates (optional)
   ↓
10. Move to next question
    ↓
11. Repeat 7-10 until complete
    ↓
12. Generate final feedback with AI
    ↓
13. Return feedback to user
```

### Voice Interaction Flow

```
1. User speaks → Audio recorded
   ↓
2. Frontend sends audio blob
   ↓
3. Worker processes audio
   ↓
4. Whisper STT → Text
   ↓
5. Llama 3.3 LLM → AI response
   ↓
6. Response sent to frontend
   ↓
7. Display text response
```

---

## Design Decisions

### Why Durable Objects?

**Chosen over KV for session state because:**
- Strong consistency guarantees
- Transactional updates
- No race conditions
- Automatic cleanup
- Global uniqueness

### Why Llama 3.3?

**Chosen over other models because:**
- Fast inference (fp8 quantization)
- Strong reasoning capabilities
- Free on Workers AI
- 70B parameter size balances quality/speed

### Why Hono?

**Chosen over Express/Fastify because:**
- Built for Cloudflare Workers
- TypeScript-first
- Lightweight (no dependencies)
- OpenAPI support (Chanfana)

---

## Scalability

**Horizontal Scaling:**
- Workers: Automatically scaled by Cloudflare
- Durable Objects: One per session (isolated)
- KV: Globally distributed

**Performance:**
- Edge execution (low latency)
- AI inference on Cloudflare GPU
- Cached question data

**Capacity:**
- Supports 1000+ concurrent sessions
- KV handles millions of reads/sec
- Workers unlimited requests

---

## Security

**Current Implementation:**
- CORS enabled for all origins (dev)
- No authentication (MVP)
- Session IDs are UUIDs (hard to guess)
- No persistent user data

**Production Considerations:**
- Add user authentication
- Implement rate limiting
- Restrict CORS origins
- Add request validation
- Sanitize user inputs

---

## Monitoring & Observability

**Available Metrics:**
- Request logs (console.log)
- Error tracking (error handler)
- Health check endpoint

**Production Needs:**
- Cloudflare Analytics
- Workers Analytics Engine
- Custom metrics for AI usage
- Performance monitoring

---

## Cost Optimization

**Free Tier Usage:**
- Workers: 100k requests/day
- Workers AI: Included models
- KV: 100k reads/day
- Durable Objects: 1GB storage

**Optimization Strategies:**
- Cache essentials in DO storage
- Minimize KV reads
- Efficient AI prompts
- Lazy load frontend assets

---

## Future Enhancements

**Planned:**
- WebSocket support for real-time updates
- Video recording for behavioral interviews
- Multi-language code execution
- Advanced analytics dashboard
- User accounts and history

**Considered:**
- Voice synthesis (TTS) with Deepgram
- Realtime API integration
- Workflow orchestration for complex interviews
- Mobile app (React Native)
