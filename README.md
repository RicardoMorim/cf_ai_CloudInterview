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
    git clone https://github.com/yourusername/cloudinterview.git
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

Detailed documentation is available in the `docs/` directory:

-   [Architecture Overview](docs/architecture.puml)
-   [Interview Flow Sequence](docs/sequence_diagram.puml)
-   [API Documentation](docs/api-architecture.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
