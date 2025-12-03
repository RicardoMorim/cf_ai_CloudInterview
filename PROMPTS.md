# Prompts Used in CloudInterview Development

## Table of Contents
1. [Initial Planning & Requirements](#1-initial-planning--requirements) 
2. [Architecture & Domain Design](#2-architecture--domain-design)
3. [Technical Implementation](#3-technical-implementation)
4. [Problem Solving & Debugging](#4-problem-solving--debugging)
5. [AI Agent Design](#5-ai-agent-design)
6. [Development workflow](#6-development-workflow)

---

## AI Tools Used
- **Primary**: Perplexity AI for architecture and problem-solving
- **Secondary**: GitHub Copilot and Antigravity Agent for code generation
- **Models**: Claude Sonnet 4.5 and Gemini 3 Pro

---
## 1. Initial Planning & Requirements

### Business Requirements Brainstorming
```
Let's implement the Online AI Interviewer. Let's brainstorm requirements.
I was thinking of an app with two modes, technical interview, and behavioral (do you think we should have in another?), and in the teachnical interview, have the coding challenge mode possible, where a random leetcode question would appear, and we'd talk with an AI about it, and solve it, just like we would with an human.
What do you think? is that possible? Should we add camera input there?
```

---

- With that prompt the AI helped me to define the project scope, requirements and the things I should focus for the MVP. It also helped me realize constraints and limitations (speacially speed) and camera usage. Thhe first limitation was solved by using fast model, at the expense of some quality. The camera was simply discarded.

- Some other questions and answers were done with AI to further define the project scope and requirements, for example, I sugested not hardcoding any questions, other than the leetcode ones in the DB, and let the AI generate them on the fly. The AI model agreed, this simplified the process, but relied heavily on the quality of the model.

### Requirements Engineering
- After some back and forth, when I felt we had though of it long enough, I asked the AI to generate the final requirements for this project.
---
```
Ready! Create a whole requirements engineering file. Where we decide Functional and Non functional requirements for this user story.
```

- The AI generated a requirements engineering file, where it defined the functional and non functional requirements, as well as the main user story, for this project.


---

## 2. Architecture & Domain Design

### Domain Model Design
```
"Okay, now help me thinking about the engineering. What domain classes we'll need. We'll use DDD."
```

**AI Output:** Suggested InterviewSession aggregate, Question entities, value objects...

### Database Schema Decision
```
"I've found a good dataset with 3500 questions. Which DB service should i use?"
```

**Decision:** Cloudflare KV for static question bank, Durable Objects for sessions

### Naming & Branding
```
"give me a name for the link and for the project
https://<subdomain>.workers.dev"
```

**Result:** Chose "cloudinterview" for clarity and Cloudflare alignment

---

## 3. Technical Implementation

### KV Upload Strategy
```
"How can i update this code to update only the ones that were not uploaded?
[context about 1262 failed, 1931 rate limited]"
```

**Solution:** Created resume logic for failed uploads

### Durable Objects Migration
```
"What does this mean?
X [ERROR] In order to use Durable Objects with a free plan, you must create a 
namespace using a `new_sqlite_classes` migration. [code: 10097]"
```

**Solution:** Migrated to SQLite-backed Durable Objects for free plan

---

## 4. Problem Solving & Debugging

### Code Execution Dilemma
```
"oh wait... there's an issue with this... I'll have to run the code in the platform... 
And have it for multiple languages... How does Leetcode do it?"
```

**Solution:** Decided on hybrid approach - JS/TS native, others via AI review + Leetcode link

### Question Type Storage
```
"Should we have theoretical question type? The bank doesn't have those..."
```

**Solution:** Static bank for coding, AI-generated for theoretical/behavioral

---

## 5. AI Agent Design

### Interview Agent System Prompt
```txt
> You are an expert software engineer and architect helping design and build an agent-powered cloud application.  
> The project is called **CloudInterview**, an interactive AI-powered platform where users can practice realistic job interviews for technical and behavioral roles.  
> 
> **Core goals:**
> - Simulate real-world coding, technical, and behavioral interviews using conversational LLM agents.
> - Allow candidates to select their job type (behavioral or technical), interview mode, and session difficulty.
> - Present coding challenges (in case of technical) (sourced from a rich dataset) via in-app code editor, allowing for code review and interactive Q&A.
> - Enable voice and text input so candidates can engage naturally, and the agent can “listen” to and process their reasoning.
> - Store, manage, and retrieve session transcripts, code answers, AI follow-ups, and feedback summaries for user review.
> 
> **Architecture:**
> - **Frontend:** SPA (React or similar), offering chat UI, coding editor, and voice input (using browser APIs or real-time services).
> - **Backend:** Cloudflare Workers with Agents SDK, managing interview sessions as aggregates, orchestrating LLM interactions, and interfacing with persistent storage.
> - **Storage:** Cloudflare KV for question bank (coding challenges + descriptions + metadata), Durable Objects for stateful session management.
> - **LLM:** Llama 3.3 via Workers AI for prompt-driven question/adaptive feedback generation and conversational context.
> 
> **Functional Areas:**
> - Dynamic interview session creation, with question selection or generation based on role/session type.
> - Interactive coding challenge flow, with agent review, rating, and multi-turn follow-ups.
> - Behavioral and theoretical Q&A, using LLM to adapt to user responses, probe deeper, and provide rich feedback.
> - Transcript storage, session history, and data export for review and improvement.
> - Support for scalable, edge-driven usage, with a noSQL approach for fast access and flexible metadata.
> - Behavioral interviews are fully generated by AI  
>
> **Design Choices:**
> - Code execution for JS/TS supported natively (if feasible), for other languages, use AI code review and mention leetcode's link where they can test their solution.
> - Robust error handling for dataset gaps or rate limiting in uploads and lookups.
> - Modular, extensible agent/service design (DDD-inspired), enabling future features (more interview modes, advanced analytics, admin question management, etc.).
> - Technical questions are in the cloudflares KV database
> 
> **Expected Workflow**
> - User inputs his resume and personal info for AI knowledge
> - User starts an interview and selects a type (Behavioral or Technical)
> - If behavioral, user inputs job description, job title, and seniority. A voice chat with an AI interviewer will then start and the user will talk with the AI. At the end, a transcript will be provided to the User, an AI will evaluate the user's performance and give a veredict, if moves to the next phase or not. User then can chat with an AI about the transcript and find ways to improve
> - If technical, an AI would choose between theorical, or coding challenges, te AI would start talking with the user, if its coding challenges, a IDE appears, and a leetcode challenge is choosen by an AI. the user solves the problem while talking with the AI (TS/JS runtime can be added if possible, other runtimes the user should be told to use the questions leetcode url). The AI can also do some theorical questions in this type as it deems necessary. At the end the same transcript would be provided along with a veredict and this time, the code submited and the question. The user would also be able to chat about it. If its theorical, the AI would make questions similar to the behavioral, but more technical instead of the theorical ones. At the end the same transcript, veredict and chat would be able to the user
>
> **Your job:**  
> - Architect the system for scalability, modularity, and best developer experience.
> - Design robust domain models, storage schemas, and session workflows.
> - Advise on optimal prompt structure and API endpoint design for multi-step, agent-driven interview practice.
> - Guide the implementation of batch processing, error recovery, and edge delivery best practices.
> - Start by designing the implementation with a good documentation.
> - Make any questions you have
> - Refine business logic and stop after each part of the documentation so that i can give feedback
> - All diagrams are to be done using plant Uml.
```


### Agent Behavior Design

- This was a conclusion I came on how to handle the interview process and review, and I agreed with the AI's suggestion.

```
"So you're suggesting coding questions stored, and store code answers.
Store the transcript in all interviews.
At the end, pass the transcript and code answers, and let an AI review it?"
```

**Approach:** Transcript-based evaluation with dynamic AI feedback

---

## 6. Development Workflow

### Copilot Integration
- Used the comprehensive system prompt to initialize GitHub Copilot
- Iterative refinement through questions and feedback
- AI handled boilerplate, developer handled complex business logic

### Key Development Steps
1. Set up Cloudflare infrastructure (Workers, KV, Durable Objects)
2. Uploaded 3500+ LeetCode problems to KV
3. Implemented session management with Durable Objects
4. Built interview agent with Llama 3.3
5. Created transcript storage and evaluation logic
6. Integrated voice input via browser APIs

---

## Key Learnings

- **AI excels at**: Architecture brainstorming, requirements refinement, boilerplate generation
- **Developer needed for**: Complex state management, Cloudflare-specific constraints, debugging platform issues
- **Iterative prompting**: Each architectural decision built on previous AI feedback
- **Hybrid approach**: Combined AI suggestions with practical platform limitations
