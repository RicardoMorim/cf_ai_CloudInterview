# CloudInterview - API Architecture Design

## Overview

This document outlines the comprehensive API architecture for CloudInterview, designed as a RESTful API with WebSocket support for real-time interview interactions. The API follows OpenAPI 3.1 specification and is built on Cloudflare Workers with Chanfana for automatic documentation generation.

## API Design Principles

1. **RESTful Design**: Standard HTTP methods and status codes
2. **Consistent Naming**: Clear, descriptive endpoint names and parameter conventions
3. **Versioning**: API versioning through URL path (`/v1/`)
4. **Authentication**: JWT-based authentication with refresh tokens
5. **Rate Limiting**: Per-user rate limiting to prevent abuse
6. **Pagination**: Consistent pagination for list endpoints
7. **Error Handling**: Standardized error response format
8. **Real-time Support**: WebSocket endpoints for interactive interview sessions

## API Base Structure

```
Base URL: https://api.cloudinterview.dev/v1
Authentication: Bearer Token (JWT)
Content-Type: application/json
```

## Authentication Flow

### 1. User Registration
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "preferredLanguages": ["javascript", "python"],
  "experienceLevel": "mid"
}
```

### 2. User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### 3. Token Refresh
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

### 4. Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

## Core API Endpoints

### User Management (`/api/users`)

#### GET /api/users/me
Get current user profile

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "profile": {
      "jobTitles": ["Senior Software Engineer"],
      "experienceLevel": "mid",
      "primaryLanguages": ["javascript", "python"],
      "industries": ["tech", "finance"],
      "resumeSummary": "Full-stack developer with 5 years experience...",
      "areasOfInterest": ["web development", "cloud computing"]
    },
    "preferences": {
      "defaultMode": "technical",
      "defaultDifficulty": "medium",
      "languagePreferences": ["javascript", "python"],
      "feedbackStyle": "detailed",
      "voiceInputEnabled": false,
      "darkMode": true
    },
    "stats": {
      "totalSessions": 15,
      "averageScore": 78.5,
      "completedChallenges": 23,
      "streakDays": 7
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "lastActive": "2024-01-20T14:45:00Z"
  }
}
```

#### PUT /api/users/me
Update user profile

**Request:**
```json
{
  "profile": {
    "jobTitles": ["Senior Software Engineer", "Tech Lead"],
    "experienceLevel": "senior",
    "primaryLanguages": ["typescript", "go"],
    "resumeSummary": "Senior full-stack developer...",
    "areasOfInterest": ["distributed systems", "machine learning"]
  },
  "preferences": {
    "defaultMode": "mixed",
    "defaultDifficulty": "hard",
    "feedbackStyle": "actionable",
    "voiceInputEnabled": true
  }
}
```

#### GET /api/users/me/sessions
Get user's interview session history

**Query Parameters:**
- `limit` (integer, default: 20): Number of sessions to return
- `offset` (integer, default: 0): Number of sessions to skip
- `mode` (string, optional): Filter by interview mode
- `status` (string, optional): Filter by session status
- `startDate` (string, optional): Filter by start date (ISO format)

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "session_123",
      "mode": "technical",
      "jobType": "Senior Software Engineer",
      "difficulty": "hard",
      "status": "completed",
      "createdAt": "2024-01-20T14:30:00Z",
      "completedAt": "2024-01-20T15:45:00Z",
      "duration": 75,
      "overallScore": 85,
      "questionCount": 8,
      "feedbackAvailable": true
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Interview Session Management (`/api/sessions`)

#### POST /api/sessions
Start a new interview session

**Request:**
```json
{
  "mode": "technical",
  "jobType": "Senior Software Engineer",
  "difficulty": "medium",
  "duration": 45,
  "language": "javascript",
  "includeCoding": true,
  "topics": ["algorithms", "data structures", "system design"]
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session_123",
    "mode": "technical",
    "jobType": "Senior Software Engineer",
    "difficulty": "medium",
    "status": "pending",
    "createdAt": "2024-01-20T14:30:00Z",
    "estimatedDuration": 45,
    "questionCount": 6,
    "aiInterviewer": {
      "name": "Alex",
      "personality": "professional",
      "experience": "10 years as engineering manager"
    }
  },
  "nextAction": {
    "type": "intro",
    "message": "Welcome! I'm Alex, your AI interviewer. Let's begin your Senior Software Engineer interview...",
    "estimatedTime": 2
  }
}
```

#### GET /api/sessions/{sessionId}
Get session details

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session_123",
    "mode": "technical",
    "jobType": "Senior Software Engineer",
    "difficulty": "medium",
    "status": "in_progress",
    "createdAt": "2024-01-20T14:30:00Z",
    "startedAt": "2024-01-20T14:32:00Z",
    "currentQuestionIndex": 3,
    "questionCount": 6,
    "duration": 18,
    "questions": [
      {
        "questionId": "q_123",
        "type": "behavioral",
        "title": "Tell me about a challenging project",
        "text": "Describe a challenging technical project you worked on...",
        "status": "answered",
        "answeredAt": "2024-01-20T14:35:00Z",
        "responseTime": 120
      }
    ],
    "codingChallenge": {
      "challengeId": "challenge_456",
      "title": "Binary Tree Maximum Path Sum",
      "description": "Given a non-empty binary tree...",
      "difficulty": "hard",
      "status": "in_progress",
      "startedAt": "2024-01-20T14:40:00Z",
      "timeSpent": 340
    }
  }
}
```

#### POST /api/sessions/{sessionId}/questions/next
Get next question in session

**Response:**
```json
{
  "success": true,
  "question": {
    "questionId": "q_789",
    "type": "coding",
    "category": "algorithms",
    "difficulty": "medium",
    "title": "Two Sum",
    "text": "Given an array of integers nums and an integer target...",
    "estimatedTime": 15,
    "hints": ["Consider using a hash map", "Think about complement values"],
    "followUpQuestions": ["What's the time complexity?", "How would you handle duplicates?"]
  },
  "session": {
    "currentQuestionIndex": 4,
    "remainingQuestions": 3,
    "estimatedTimeRemaining": 25
  }
}
```

#### POST /api/sessions/{sessionId}/answers
Submit answer to current question

**Request:**
```json
{
  "answerText": "I would use a hash map to store the complement of each number...",
  "codeSubmission": {
    "language": "javascript",
    "code": "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}",
    "approachExplanation": "Using a hash map allows O(1) lookup time..."
  },
  "responseTime": 180
}
```

**Response:**
```json
{
  "success": true,
  "answer": {
    "answerId": "answer_123",
    "questionId": "q_789",
    "submittedAt": "2024-01-20T14:45:00Z",
    "responseTime": 180,
    "scores": {
      "completeness": 85,
      "correctness": 90,
      "communication": 80
    }
  },
  "aiResponse": {
    "responseId": "response_456",
    "content": "Great approach! You've correctly identified that a hash map provides O(1) lookup time. Your solution has O(n) time complexity and O(n) space complexity, which is optimal for this problem...",
    "sentiment": "positive",
    "followUp": true,
    "followUpQuestion": "How would you modify this solution to handle cases where the array contains duplicate values?"
  },
  "nextAction": {
    "type": "follow_up",
    "message": "How would you modify this solution to handle cases where the array contains duplicate values?",
    "maxResponseTime": 120
  }
}
```

#### POST /api/sessions/{sessionId}/complete
Complete the interview session

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session_123",
    "status": "completed",
    "completedAt": "2024-01-20T15:15:00Z",
    "duration": 45,
    "overallScore": 82,
    "questionCount": 6,
    "accuracy": 87.5,
    "communicationScore": 78,
    "problemSolvingScore": 85
  },
  "feedback": {
    "feedbackId": "feedback_123",
    "summary": "Strong technical foundation with good problem-solving skills...",
    "overallScore": 82,
    "strengths": [
      "Excellent algorithmic thinking",
      "Clear communication of approach",
      "Good understanding of data structures"
    ],
    "improvementAreas": [
      "Need to work on system design concepts",
      "Could improve time management during interviews"
    ],
    "recommendations": [
      "Practice more system design questions",
      "Focus on explaining trade-offs in solution choices",
      "Work on answering behavioral questions with STAR method"
    ],
    "percentileRank": 78,
    "generatedAt": "2024-01-20T15:15:30Z"
  },
  "transcript": {
    "downloadUrl": "https://api.cloudinterview.dev/v1/sessions/session_123/transcript.pdf",
    "shareableLink": "https://cloudinterview.dev/share/session_123"
  }
}
```

### Question Bank (`/api/questions`)

#### GET /api/questions
Get questions with filtering and pagination

**Query Parameters:**
- `type` (string, optional): Question type filter
- `difficulty` (string, optional): Difficulty filter
- `category` (string, optional): Category filter
- `topics` (string, optional): Comma-separated topics
- `limit` (integer, default: 20): Number of questions
- `offset` (integer, default: 0): Offset for pagination

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "questionId": "q_123",
      "type": "coding",
      "category": "algorithms",
      "difficulty": "medium",
      "title": "Two Sum",
      "estimatedTime": 15,
      "tags": ["array", "hash-table"],
      "solvedCount": 15420,
      "successRate": 78.5
    }
  ],
  "pagination": {
    "total": 2000,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "types": ["coding", "theory", "behavioral"],
    "difficulties": ["easy", "medium", "hard"],
    "categories": ["algorithms", "data structures", "system design"],
    "topics": ["array", "string", "linked-list", "tree"]
  }
}
```

#### GET /api/questions/{questionId}
Get detailed question information

**Response:**
```json
{
  "success": true,
  "question": {
    "questionId": "q_123",
    "type": "coding",
    "category": "algorithms",
    "difficulty": "medium",
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target...",
    "estimatedTime": 15,
    "tags": ["array", "hash-table"],
    "hints": ["Use hash map for O(1) lookup", "Consider complement values"],
    "followUpQuestions": ["What's the space complexity?", "How to handle duplicates?"],
    "similarQuestions": ["q_456", "q_789"],
    "solvedCount": 15420,
    "successRate": 78.5,
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/questions/random
Get random questions

**Query Parameters:**
- `count` (integer, default: 5): Number of questions
- `difficulty` (string, optional): Difficulty filter
- `type` (string, optional): Type filter

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "questionId": "q_123",
      "type": "coding",
      "difficulty": "medium",
      "title": "Two Sum",
      "estimatedTime": 15
    }
  ]
}
```

### Feedback and Analytics (`/api/feedback`)

#### GET /api/feedback/{feedbackId}
Get detailed feedback

**Response:**
```json
{
  "success": true,
  "feedback": {
    "feedbackId": "feedback_123",
    "sessionId": "session_123",
    "overallScore": 82,
    "summary": "Strong technical foundation with good problem-solving skills...",
    "technicalSkills": {
      "skill": "Algorithm Design",
      "score": 85,
      "level": "advanced",
      "confidence": 0.95,
      "evidence": ["Correctly identified optimal O(n) solution", "Good hash map usage"],
      "growthTrajectory": "improving"
    },
    "communication": {
      "skill": "Technical Communication",
      "score": 78,
      "level": "intermediate",
      "confidence": 0.90,
      "evidence": ["Clear explanation of approach", "Good code comments"],
      "growthTrajectory": "stable"
    },
    "strengths": ["Excellent algorithmic thinking", "Clear communication"],
    "improvementAreas": ["System design concepts", "Time management"],
    "recommendations": ["Practice system design questions", "Focus on trade-offs"],
    "percentileRank": 78,
    "benchmarkComparison": {
      "role": "Senior Software Engineer",
      "categoryAverage": 75,
      "topQuartile": 90,
      "difference": 7
    },
    "generatedAt": "2024-01-20T15:15:30Z"
  }
}
```

#### GET /api/users/me/analytics
Get user analytics and progress

**Response:**
```json
{
  "success": true,
  "analytics": {
    "overview": {
      "totalSessions": 15,
      "averageScore": 78.5,
      "completionRate": 95.0,
      "streakDays": 7,
      "totalHours": 12.5
    },
    "performanceByCategory": [
      {
        "category": "algorithms",
        "averageScore": 82.0,
        "sessionCount": 8,
        "trend": "improving"
      }
    ],
    "skillProgress": [
      {
        "skill": "Data Structures",
        "currentLevel": "advanced",
        "progress": 85,
        "nextMilestone": "expert at 90%"
      }
    ],
    "recentActivity": [
      {
        "date": "2024-01-20",
        "sessions": 2,
        "averageScore": 85.0
      }
    ],
    "recommendations": [
      {
        "type": "practice",
        "content": "Focus on system design questions",
        "priority": "high"
      }
    ]
  }
}
```

### WebSocket Real-time Endpoints

#### wss://api.cloudinterview.dev/v1/interviews/{sessionId}

WebSocket connection for real-time interview interaction.

**Events:**

1. **question_presented**
```json
{
  "type": "question_presented",
  "data": {
    "question": {
      "questionId": "q_123",
      "type": "coding",
      "title": "Two Sum",
      "text": "Given an array...",
      "estimatedTime": 15
    },
    "session": {
      "currentQuestionIndex": 3,
      "totalQuestions": 6
    }
  }
}
```

2. **answer_evaluated**
```json
{
  "type": "answer_evaluated",
  "data": {
    "answer": {
      "answerId": "answer_123",
      "scores": {"completeness": 85, "correctness": 90}
    },
    "aiResponse": {
      "content": "Great approach!",
      "sentiment": "positive"
    }
  }
}
```

3. **session_completed**
```json
{
  "type": "session_completed",
  "data": {
    "session": {"sessionId": "session_123", "overallScore": 82},
    "feedback": {"feedbackId": "feedback_123"}
  }
}
```

4. **typing_indicator**
```json
{
  "type": "typing_indicator",
  "data": {
    "isTyping": true,
    "userId": "ai_interviewer"
  }
}
```

## Error Response Format

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "issue": "Email format is invalid"
    },
    "timestamp": "2024-01-20T15:30:00Z"
  }
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **Session endpoints**: 60 requests per minute per user
- **Question endpoints**: 100 requests per minute per user
- **Feedback endpoints**: 30 requests per minute per user

## Security Considerations

1. **JWT Authentication**: Secure token-based authentication
2. **Input Validation**: Comprehensive validation for all inputs
3. **Rate Limiting**: Protection against abuse
4. **CORS**: Proper CORS configuration
5. **HTTPS**: All endpoints require HTTPS
6. **Data Encryption**: Sensitive data encrypted in transit and at rest

## API Versioning

- Current version: `v1`
- Breaking changes will result in new version (e.g., `v2`)
- Deprecated endpoints will be supported for 6 months after new version release

This API architecture provides a comprehensive foundation for building the CloudInterview platform with clear separation of concerns, consistent patterns, and excellent developer experience.