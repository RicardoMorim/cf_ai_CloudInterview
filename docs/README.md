# Documentation Index

Welcome to CloudInterview documentation! This page provides quick links to all documentation resources.

## 📚 Core Documentation

### Architecture
- **[System Overview](architecture/overview.md)** - High-level architecture and design decisions
- **[System Diagrams](architecture/diagrams/)** - Visual representations (PlantUML)

### API Reference
- **[API Endpoints](api/endpoints.md)** - Complete REST API documentation
- **[Request/Response Examples](api/endpoints.md#sessions-api)** - Real-world usage examples

### AI Integration
- **[Llama 3.3 Integration](../PROMPTS.md)** - How we use Workers AI
- **[Prompt Engineering](../PROMPTS.md)** - AI prompts and strategies

---

## 📖 Additional Resources

### Features
- **[Technical Interviews](requirements_engineering/requirements.md)** - Coding challenge mode
- **[Behavioral Interviews](requirements_engineering/requirements.md)** - STAR method practice
- **Voice Interaction** - Speech-to-text with Whisper

### Development
- **[Project Structure](getting-started/installation.md#project-structure)** - Codebase organization
- **[Deployment](getting-started/installation.md#deployment)** - Production deployment guide

---

## 🎯 For Cloudflare Reviewers

**Quick Links:**
1. [Getting Started](getting-started/installation.md) - Run the app locally
2. [Architecture Overview](architecture/overview.md) - Understand Cloudflare stack usage
3. [API Documentation](api/endpoints.md) - Explore endpoints
4. [AI Prompts](../PROMPTS.md) - Review AI usage

**Cloudflare Technologies Used:**
- ✅ Workers AI (Llama 3.3 70B, Whisper)
- ✅ Durable Objects (session management)
- ✅ KV Storage (3000+ questions)
- ✅ Workers (serverless execution)

---

## 📊 Diagrams

Visual representations of the system:

- [System Architecture](high-level%20overview/architecture.puml) - Overall system design
- [Sequence Diagram](sequence-diagram/sequence_diagram.puml) - Interview flow
- [Class Diagram](class%20diagram/diagram.puml) - Code structure
- [Domain Model](domain%20model/domain.puml) - Data models

---

## 📝 Contributing

This is a Cloudflare internship assignment project. See [LICENSE](../LICENSE) for details.

---

## 🔗 External Links

- **GitHub Repository:** [RicardoMorim/cf_ai_CloudInterview](https://github.com/RicardoMorim/cf_ai_CloudInterview)
- **Live Demo:** [CloudInterview](https://cf-ai-cloud-interview.vercel.app/)
- **Cloudflare Workers:** [Documentation](https://developers.cloudflare.com/workers/)
