# CloudInterview - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying CloudInterview to Cloudflare's platform, including Workers, KV, Durable Objects, and Pages. The deployment process is designed to be automated and reproducible using GitHub Actions and Wrangler CLI.

## Prerequisites

### Required Tools

1. **Node.js**: Version 18 or higher
2. **npm**: Version 8 or higher
3. **Wrangler**: Cloudflare's CLI tool
4. **Git**: Version control
5. **GitHub Account**: For CI/CD (optional but recommended)

### Installation

```bash
# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install Wrangler globally
npm install -g @cloudflare/wrangler

# Verify installations
node --version
npm --version
wrangler --version
```

### Cloudflare Account Setup

1. Sign up for a Cloudflare account at [cloudflare.com](https://cloudflare.com)
2. Navigate to the [Workers dashboard](https://dash.cloudflare.com)
3. Note your Account ID (found in Account Home > Overview)

## Environment Configuration

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-username/CloudInterview.git
cd CloudInterview

# Install dependencies
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```bash
# Cloudflare Configuration
CF_ACCOUNT_ID="your_account_id"
CF_API_TOKEN="your_api_token"

# Application Configuration
API_BASE_URL="https://your-worker.your-namespace.workers.dev"
WS_URL="wss://your-worker.your-namespace.workers.dev"

# Feature Flags
ENABLE_VOICE_INPUT=true
ENABLE_CODE_EXECUTION=false
DEBUG_MODE=false
```

### 3. API Token Setup

1. Go to Cloudflare Dashboard > My Profile > API Tokens
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template
4. Add the following permissions:
   - Account > Workers Scripts > Edit
   - Account > Workers KV Namespace > Edit
   - Account > Workers Durable Objects > Edit
   - Zone > Workers Routes > Edit
5. Copy the generated token and add it to your `.env` file

## Infrastructure Setup

### 1. Create KV Namespaces

```bash
# Create KV namespace for questions
wrangler kv:namespace create "QUESTION_KV"

# Create KV namespace for user data
wrangler kv:namespace create "USER_KV"

# Create KV namespace for session data
wrangler kv:namespace create "SESSION_KV"
```

After running these commands, update your `wrangler.toml` with the generated namespace IDs:

```toml
[[kv_namespaces]]
binding = "QUESTION_KV"
id = "your_question_namespace_id"

[[kv_namespaces]]
binding = "USER_KV"
id = "your_user_namespace_id"

[[kv_namespaces]]
binding = "SESSION_KV"
id = "your_session_namespace_id"
```

### 2. Create Durable Object Namespaces

```bash
# Create Durable Object namespace for sessions
wrangler dofns create "SESSION_DO" --binding "SESSION_NAMESPACE"
```

Update your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "SESSION_NAMESPACE"
database_name = "session-do"
database_id = "your_durable_object_id"
```

### 3. Create D1 Database (for persistent user data)

```bash
# Create D1 database
wrangler d1 create "cloudinterview-db"

# Apply the schema
wrangler d1 execute cloudinterview-db --file=./migrations/schema.sql
```

## Data Seeding

### 1. Upload Question Bank

```bash
# Upload LeetCode problems to KV
python cloudinterview_upload.py upload leetcode_problems.csv

# Or use the direct upload script
python upload_to_kv.py --csv leetcode_problems.csv
```

### 2. Seed Initial Data

Create a migration script to seed initial data:

```typescript
// migrations/seed.ts
import { Hono } from 'hono';

export async function seedDatabase(env: Env) {
  // Seed admin users
  const adminUser = {
    userId: "admin_1",
    email: "admin@cloudinterview.dev",
    name: "Admin User",
    // ... other user data
  };
  
  await env.USER_KV.put(`user:${adminUser.userId}`, JSON.stringify(adminUser));
  
  // Seed system configuration
  const config = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    features: {
      voiceInput: true,
      codeExecution: false
    }
  };
  
  await env.QUESTION_KV.put("system:config", JSON.stringify(config));
}
```

## Configuration Files

### 1. Wrangler Configuration (`wrangler.toml`)

```toml
name = "cloudinterview"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "${CF_ACCOUNT_ID}"

# Environment-specific configurations
[env.production]
route = "api.cloudinterview.dev/*"
zone_id = "your_zone_id"

[env.development]
route = "dev-api.cloudinterview.dev/*"

# KV Namespaces
[[kv_namespaces]]
binding = "QUESTION_KV"
id = "${CF_QUESTION_KV_ID}"

[[kv_namespaces]]
binding = "USER_KV"
id = "${CF_USER_KV_ID}"

[[kv_namespaces]]
binding = "SESSION_KV"
id = "${CF_SESSION_KV_ID}"

# Durable Objects
[[durable_objects.bindings]]
name = "SESSION_NAMESPACE"
class_name = "InterviewSessionDO"

# Variables
[vars]
ENVIRONMENT = "production"
API_VERSION = "v1"

# Build configuration
[build]
command = "npm run build"
cwd = "."
watch_dir = "src"

# Pages configuration (for frontend)
[pages]
build_output = "./dist"
build_command = "npm run build"
compatibility_flags = ["nodejs_compat"]

# Usage model (unlimited for production)
usage_model = "unlimited"
```

### 2. Package.json Scripts

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "tsc && vite build",
    "deploy": "wrangler deploy",
    "deploy:production": "wrangler deploy --env production",
    "deploy:staging": "wrangler deploy --env development",
    "publish": "wrangler publish",
    "tail": "wrangler tail",
    "kv:upload": "python cloudinterview_upload.py upload",
    "db:push": "wrangler d1 execute cloudinterview-db --file=./migrations/schema.sql",
    "test": "jest",
    "test:e2e": "cypress run",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src"
  }
}
```

## Deployment Process

### 1. Local Development

```bash
# Start local development server
npm run dev

# This will:
# - Start Wrangler dev server
# - Enable local KV and Durable Objects
# - Hot reload on file changes
# - Open Swagger UI at http://localhost:8787
```

### 2. Staging Deployment

```bash
# Deploy to staging environment
npm run deploy:staging

# Verify deployment
curl https://dev-api.cloudinterview.dev/health
```

### 3. Production Deployment

```bash
# Deploy to production
npm run deploy:production

# Verify deployment
curl https://api.cloudinterview.dev/health

# Run smoke tests
npm run test:e2e:smoke
```

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
    
    - name: Build application
      run: npm run build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    environment:
      name: staging
      url: https://dev-api.cloudinterview.dev
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Deploy to Staging
      uses: cloudflare/actions@wrangler
      with:
        apiToken: ${{ secrets.CF_API_TOKEN }}
        accountId: ${{ secrets.CF_ACCOUNT_ID }}
        command: 'wrangler deploy --env development'
    
    - name: Run smoke tests
      run: |
        sleep 30  # Wait for deployment
        curl -f https://dev-api.cloudinterview.dev/health

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    environment:
      name: production
      url: https://api.cloudinterview.dev
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Deploy to Production
      uses: cloudflare/actions@wrangler
      with:
        apiToken: ${{ secrets.CF_API_TOKEN }}
        accountId: ${{ secrets.CF_ACCOUNT_ID }}
        command: 'wrangler deploy --env production'
    
    - name: Run smoke tests
      run: |
        sleep 30  # Wait for deployment
        curl -f https://api.cloudinterview.dev/health
    
    - name: Notify deployment
      run: |
        echo "Production deployment successful!"

  data-sync:
    needs: deploy-production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install Python dependencies
      run: pip install -r requirements.txt
    
    - name: Sync question data
      run: python cloudinterview_upload.py upload leetcode_problems.csv
      env:
        CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
        CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

## Monitoring and Observability

### 1. Health Checks

```typescript
// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    services: {
      kv: 'healthy',
      durable_objects: 'healthy',
      ai: 'healthy'
    }
  });
});
```

### 2. Logging Configuration

```typescript
// Structured logging
export function logger(level: string, message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    environment: process.env.ENVIRONMENT
  };
  
  console.log(JSON.stringify(logEntry));
}
```

### 3. Error Tracking

```typescript
// Error handler middleware
app.onError((err, c) => {
  logger('error', err.message, {
    stack: err.stack,
    url: c.req.url,
    method: c.req.method
  });
  
  return c.json({
    success: false,
    error: {
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  }, 500);
});
```

## Performance Optimization

### 1. Caching Strategy

```typescript
// KV caching for frequently accessed data
export async function getCachedQuestions(env: Env, key: string) {
  const cached = await env.QUESTION_KV.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from source
  const questions = await fetchQuestions();
  
  // Cache for 1 hour
  await env.QUESTION_KV.put(key, JSON.stringify(questions), {
    expirationTtl: 3600
  });
  
  return questions;
}
```

### 2. Rate Limiting

```typescript
// Rate limiting middleware
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map();
  
  return (c: Context, next: Function) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip)!.filter(time => time > windowStart);
    
    if (userRequests.length >= maxRequests) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    
    userRequests.push(now);
    requests.set(ip, userRequests);
    
    return next();
  };
}
```

## Security Considerations

### 1. Environment Variables

```bash
# Production environment variables should be set in Cloudflare Dashboard
# Never commit .env files to version control
```

### 2. CORS Configuration

```typescript
// CORS middleware
app.use('*', cors({
  origin: ['https://cloudinterview.dev', 'https://www.cloudinterview.dev'],
  credentials: true
}));
```

### 3. Input Validation

```typescript
// Request validation using Zod
const createSessionSchema = z.object({
  mode: z.enum(['technical', 'behavioral']),
  jobType: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard'])
});

app.post('/api/sessions', zValidator('json', createSessionSchema), handler);
```

## Troubleshooting

### Common Issues

1. **KV Namespace Not Found**
   ```bash
   # Check namespace bindings in wrangler.toml
   # Verify namespace IDs are correct
   wrangler kv:namespace list
   ```

2. **Durable Object Errors**
   ```bash
   # Check Durable Object bindings
   # Verify class names match
   wrangler dev --verbose
   ```

3. **Build Failures**
   ```bash
   # Check TypeScript compilation
   npx tsc --noEmit
   
   # Check for missing dependencies
   npm ls
   ```

### Debug Commands

```bash
# View real-time logs
wrangler tail

# Test API endpoints locally
wrangler dev

# Check KV contents
wrangler kv:key list --namespace-id=<namespace_id>

# Check D1 database
wrangler d1 execute <database_name> --command="SELECT * FROM users LIMIT 10;"
```

## Scaling Considerations

### 1. Worker Resources

- **CPU Time**: 20ms per request (unlimited plan provides more)
- **Memory**: 128MB per request
- **KV Operations**: Rate-limited, consider caching strategies
- **Durable Objects**: Scale automatically with usage

### 2. Cost Optimization

```toml
# Use appropriate usage model
usage_model = "bundled"  # For development
usage_model = "unlimited"  # For production
```

### 3. Performance Monitoring

- Use Cloudflare Analytics for request monitoring
- Implement custom metrics for business KPIs
- Set up alerts for error rates and response times

This deployment guide provides a comprehensive approach to deploying CloudInterview with best practices for cloud-native applications on Cloudflare's platform.