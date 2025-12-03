# API Documentation

## Overview

CloudInterview provides a RESTful API built on Cloudflare Workers with Hono framework. All endpoints use JSON for request and response bodies.

**Base URL:** `https://your-worker.workers.dev` (or `http://localhost:8787` for local development)

**Authentication:** Not currently implemented (MVP)

**CORS:** Enabled for all origins

### Architecture Diagrams

For visual representation of the system:
- [System Architecture](../architecture/system-architecture.puml) - Component overview
- [Sequence Diagram](../sequence-diagram/sequence_diagram.puml) - Interview flow
- [Domain Model](../domain%20model/domain.puml) - Data structures

---

## Sessions API

### Create Interview Session

**Endpoint:** `POST /api/sessions`

**Description:** Creates a new interview session with AI-selected questions based on job context.

**Request Body:**
```json
{
  "userId": "user_123",
  "mode": "technical" | "behavioral",
  "jobType": "Software Engineer",
  "difficulty": "easy" | "medium" | "hard",
  "jobTitle": "Senior Backend Developer",
  "jobDescription": "Building scalable microservices...",
  "seniority": "senior" | "mid" | "junior"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sessionId": "0x1a2b3c4d...",
    "mode": "technical",
    "status": "in_progress",
    "questions": [
      {
        "questionId": "1262",
        "type": "coding",
        "title": "Two Sum",
        "text": "Given an array of integers...",
        "difficulty": "easy",
        "hints": ["Try using a hash map", "..."]
      }
    ],
    "currentQuestionIndex": 0
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Missing required field: mode"
  }
}
```

---

### Get Next Question

**Endpoint:** `GET /api/sessions/:sessionId/question/next`

**Description:** Moves to the next question in the interview session.

**Parameters:**
- `sessionId` (path): Session identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "question": {
      "questionId": "1931",
      "type": "coding",
      "title": "Merge Two Sorted Lists",
      "text": "...",
      "difficulty": "medium"
    },
    "session": {
      "sessionId": "...",
      "currentQuestionIndex": 1,
      "status": "in_progress"
    }
  }
}
```

---

### Submit Answer

**Endpoint:** `POST /api/sessions/:sessionId/answer`

**Description:** Submits an answer to the current question.

**Request Body:**
```json
{
  "questionId": "1262",
  "answerText": "My approach is to use a hash map...",
  "code": "function twoSum(nums, target) { ... }",
  "language": "javascript"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "answer": {
      "questionId": "1262",
      "answerText": "...",
      "submittedAt": "2024-03-15T10:30:00Z",
      "evaluation": {
        "score": 85,
        "feedback": "Good approach..."
      }
    }
  }
}
```

---

### Voice Chat

**Endpoint:** `POST /api/sessions/:sessionId/chat`

**Description:** Process voice input using Whisper STT and generate AI response with Llama 3.3.

**Request Body:**
```json
{
  "message": "I think I should use a two-pointer approach"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "response": "That's a great insight! The two-pointer approach is indeed efficient here...",
    "session": {
      "sessionId": "...",
      "aiResponses": [...]
    }
  }
}
```

---

### End Session

**Endpoint:** `POST /api/sessions/:sessionId/end`

**Description:** Completes the interview and generates final feedback.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "...",
      "status": "completed",
      "completedAt": "2024-03-15T11:00:00Z",
      "feedback": {
        "overallScore": 82,
        "summary": "Strong performance with good problem-solving skills...",
        "strengths": ["Clear communication", "Efficient solutions"],
        "improvementAreas": ["Consider edge cases more"],
        "specificRecommendations": ["Practice dynamic programming patterns"]
      }
    }
  }
}
```

---

## AI Features API

### Code Execution

**Endpoint:** `POST /api/code/run`

**Description:** Executes user code in a sandboxed environment.

**Request Body:**
```json
{
  "code": "console.log('Hello, World!');",
  "language": "javascript",
  "testCases": [
    { "input": "[2,7,11,15], 9", "expectedOutput": "[0,1]" }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "output": "Hello, World!\n",
    "passed": true,
    "executionTime": 45
  }
}
```

---

## Example Endpoints (Development/Testing)

### AI Generate

**Endpoint:** `POST /api/ai/generate`

**Description:** Test endpoint for Llama 3.3 integration.

**Request Body:**
```json
{
  "prompt": "Explain bubble sort"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "response": "Bubble sort is a simple sorting algorithm...",
    "tokens": 150
  }
}
```

---

### Speech Transcription

**Endpoint:** `POST /api/ai/transcribe`

**Description:** Test endpoint for Whisper STT.

**Content-Type:** `multipart/form-data`

**Request Body:**
- `audio`: Audio file (WAV, MP3, etc.)

**Response:** `200 OK`
```json
{
  "success": true,
  "text": "I think the answer is to use a hash map",
  "vtt": "WEBVTT\n\n00:00:00.000 --> 00:00:03.000\nI think the answer is to use a hash map"
}
```

---

## Error Codes

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": "Additional context (optional)"
  }
}
```

**Common Error Codes:**
- `INVALID_INPUT` - Missing or malformed request data
- `SESSION_NOT_FOUND` - Session ID doesn't exist
- `SESSION_ALREADY_IN_PROGRESS` - Cannot start duplicate session
- `SESSION_NOT_IN_PROGRESS` - Cannot submit answer to inactive session
- `INTERNAL_ERROR` - Server error
- `AI_ERROR` - Workers AI request failed

---

## Rate Limits

Currently no rate limiting implemented (MVP). Production deployment should implement per-user rate limiting.

---

## Health Check

**Endpoint:** `GET /health`

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "services": {
    "ai": "ok",
    "kv": "ok"
  },
  "timestamp": "2024-03-15T10:00:00Z"
}
```

---

## WebSocket Support

Not currently implemented. All interactions are HTTP-based with polling for real-time updates.

---

## Notes for Cloudflare Reviewers

- **Durable Objects**: Session state is persisted in Durable Objects for reliable state management
- **Workers AI**: Llama 3.3 70B for LLM, Whisper for STT
- **KV Storage**: 3000+ LeetCode problems stored in Cloudflare KV
- **Scalability**: Stateless Workers with DO for session coordination
