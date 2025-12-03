# CloudInterview - AI-Powered Technical Interview Platform

CloudInterview is a modern, AI-driven platform designed to help developers practice for technical and behavioral interviews. It leverages Cloudflare Workers AI to provide real-time voice interaction, coding challenges, and personalized feedback.

## 🚀 Features

-   **AI Voice Interviewer:** Real-time voice interaction using Cloudflare Whisper (STT) and Llama 3 (LLM).
-   **Dual Modes:**
    -   **Technical:** Coding problems with a built-in code editor and execution environment.
    -   **Behavioral:** STAR method practice for soft skill questions.
-   **Real-time Feedback:** Instant analysis of your answers and code.
-   **Premium UI:** A modern, glassmorphism-inspired interface built with React and TypeScript.
-   **Serverless Architecture:** Fully powered by Cloudflare Workers and KV for low latency and high scalability.

## 🛠️ Tech Stack

-   **Frontend:** React, TypeScript, Vite, Monaco Editor, Chart.js
-   **Backend:** Cloudflare Workers, Hono, Cloudflare Workers AI
-   **Database:** Cloudflare KV (Key-Value Storage)
-   **AI Models:**
    -   `@cf/openai/whisper` (Speech-to-Text)
    -   `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (LLM)
    -   `@cf/deepgram/aura-1` (Text-to-Speech)

## 🏁 Getting Started

### Prerequisites

-   Node.js (v18+)
-   Cloudflare Account
-   Wrangler CLI (`npm install -g wrangler`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RicardoMorim/cloudinterview.git
    cd cloudinterview
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd ..
    npm install
    ```

### Configuration

1.  **Backend Setup:**
    Copy `wrangler.example.jsonc` to `wrangler.jsonc` and update your account details.
    ```bash
    cp wrangler.example.jsonc wrangler.jsonc
    ```

2.  **Upload Question Data:**
    Use the provided Python script to upload LeetCode problems to Cloudflare KV.
    ```bash
    python cloudinterview_upload.py full leetcode_problems.csv
    ```

### Running Locally

1.  **Start the Backend (Worker):**
    ```bash
    npm run dev
    ```

2.  **Start the Frontend:**
    ```bash
    cd frontend
    npm run start
    ```

    The application will be available at `http://localhost:3000`.

## 📖 Documentation

 Comprehensive documentation is available in the `docs/` directory:

-   **[Getting Started Guide](docs/getting-started/installation.md)** - Installation and setup
-   **[API Documentation](docs/api/endpoints.md)** - Complete API reference
-   **[Architecture Overview](docs/architecture/overview.md)** - System design and decisions
-   **[Documentation Index](docs/README.md)** - Full documentation navigation

**Visual Diagrams:**
-   [System Architecture](docs/high-level%20overview/architecture.puml)
-   [Interview Flow Sequence](docs/sequence-diagram/sequence_diagram.puml)
-   [Class Diagram](docs/class%20diagram/diagram.puml)

---

## 🎯 For Cloudflare Reviewers

This project demonstrates:

✅ **LLM Integration:** Llama 3.3 70B for question selection, evaluation, and feedback  
✅ **Workflow Coordination:** Durable Objects for stateful session management  
✅ **User Input:** Chat and voice (Whisper STT)  
✅ **Memory/State:** Durable Objects + KV storage  

**Quick Links:**
- [PROMPTS.md](PROMPTS.md) - 29 documented AI prompts
- [API Docs](docs/api/endpoints.md) - REST API reference
- [Architecture](docs/architecture/overview.md) - Cloudflare stack usage
- [Getting Started](docs/getting-started/installation.md) - Run locally

**Repository:** `cf_ai_CloudInterview` ✅ (correctly prefixed)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
