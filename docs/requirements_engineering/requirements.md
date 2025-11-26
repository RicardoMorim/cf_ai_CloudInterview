# Requirements Engineering Document

## Project: **CloudInterview**

### Purpose
A web application simulating realistic job interviews via AI, supporting both technical (coding, theory) and behavioral interviews, tailored to job type and adaptive to user responses. Leverages Cloudflare’s Agents platform, Workers AI, and stateful workflows.

***

## 1. **Scope**

- **Two primary interview modes**: Technical (with coding challenge support) and Behavioral.
- **Dynamic, AI-driven dialog** for all interactions except hardcoded coding challenges.

***

## 2. **Functional Requirements (FRs)**

### FR1. **Mode Selection**
- FR1.1: User selects the job type (e.g., SWE, SRE, PM, Analyst) at session start.
- FR1.2: User selects the desired interview mode: Technical or Behavioral.

### FR2. **Dynamic AI Interview Simulation**
- FR2.1: For behavioral mode, LLM agent generates and adapts classic behavioral questions, then evaluates responses with STAR feedback.
- FR2.2: For technical mode:
    - a. If coding job, system asks 1–2 coding challenges, then switches to theory questions.
    - b. If non-coding, only adapts theory and situational technical questions per user’s job type.

### FR3. **Coding Challenge Experience**
- FR3.1: Coding challenge problems are selected at random from a managed question database (with title, description, tags, and difficulty).
- FR3.2: Dedicated UI page for challenge description, “code” input (plain text, markdown, or rich text), and AI conversation about the problem.
- FR3.3: AI agent can provide hints, review user's code approach, and ask for clarification in follow-up.
- FR3.4: AI agent delivers summary feedback on solution quality, communication, and overall performance.

### FR4. **Session Management**
- FR4.1: Interview session is stored persistently (at least in the short term) — allows user to review transcript and AI feedback at any time after completion.
- FR4.2: User can start a new session, logout, and delete their data.

### FR5. **UI & User Input**
- FR5.1: Clean, accessible web interface (Cloudflare Pages or supported stack).
- FR5.2: Text-based chat is default; voice input support is a stretch goal.

### FR6. **Feedback Generation**
- FR6.1: At the end of each interview, the AI generates a summary including strengths, areas for improvement, and a basic “score” (optional).
- FR6.2: Download/share/export transcript and feedback.

### FR7. **System Administration**
- FR7.1: Admin interface or simple config to edit/add coding questions and manage job types.

***

## 3. **Non-Functional Requirements (NFRs)**

### NFR1. **Performance**
- NFR1.1: All AI responses and chat UI interactions shall be processed within 3 seconds 95% of the time (except for rare LLM/API slowdowns).
- NFR1.2: Coding question/feedback generation must appear within 5 seconds maximum.

### NFR2. **Reliability and Availability**
- NFR2.1: System should be available 99.5% of the time during the internship review period.
- NFR2.2: Session state (interview progress, answers) should not be lost due to brief outages or disconnects.

### NFR3. **Scalability**
- NFR3.1: The app should handle concurrent mock interviews (at least 200 users) without degradation, leveraging Cloudflare’s scalable architecture.

### NFR4. **Security & Privacy**
- NFR4.1: All user data (answers, interview sessions) are private and only visible to the user unless explicit consent/share.
- NFR4.2: No user data is accessible after session deletion.
- NFR4.3: System should not store passwords or sensitive personal identifiers.

### NFR5. **Usability**
- NFR5.1: User onboarding and start-to-finish workflow shall be straightforward (<3 steps to begin a mock interview).
- NFR5.2: UI must be accessible (WCAG Level AA recommended).

### NFR6. **Maintainability**
- NFR6.1: All business logic, question pools, and prompts should be externalized/configurable for easy updates without redeploying core logic.
