# Cloudflare Workers OpenAPI 3.1

This is a Cloudflare Worker with OpenAPI 3.1 using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

This is an example project made to be used as a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

## Get started

1. Sign up for [Cloudflare Workers](https://workers.dev). The free tier is more than enough for most use cases.
2. Clone this project and install dependencies with `npm install`
3. Run `wrangler login` to login to your Cloudflare account in wrangler
4. Run `wrangler deploy` to publish the API to Cloudflare Workers

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. For more information read the [chanfana documentation](https://chanfana.pages.dev/) and [Hono documentation](https://hono.dev/docs).

## Development

1. Run `wrangler dev` to start a local instance of the API.
2. Open `http://localhost:8787/` in your browser to see the Swagger interface where you can try the endpoints.
3. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.

# CloudInterview - Cloudflare KV Upload Solution

This project provides a complete solution for uploading LeetCode problem data from a CSV file to Cloudflare KV for fast access by Workers.

## 🚀 Quick Start

### One-Command Setup and Upload
```bash
python cloudinterview_upload.py full leetcode_problems.csv
```

### Step-by-Step
```bash
# 1. Setup Cloudflare credentials
python cloudinterview_upload.py setup

# 2. Test data validation
python cloudinterview_upload.py test leetcode_problems.csv

# 3. Upload to KV
python cloudinterview_upload.py upload leetcode_problems.csv
```

## 📋 Prerequisites

- Python 3.7+
- Cloudflare account with API access
- CSV file with LeetCode problem data

### Install Dependencies
```bash
pip install -r requirements.txt
```

## 📁 Project Structure

```
CloudInterview/
├── cloudinterview_upload.py    # Main orchestration script
├── upload_to_kv.py            # Core upload functionality
├── test_upload.py             # Data validation testing
├── setup_env.py               # Environment setup helper
├── requirements.txt            # Python dependencies
├── UPLOAD_README.md           # Detailed upload documentation
├── leetcode_problems.csv      # Input CSV file
└── src/
    ├── api-example.ts         # Worker API example
    └── index.ts               # Main Worker code
```

## 🛠️ Available Scripts

### Main Orchestration
- `cloudinterview_upload.py full` - Complete setup, test, and upload
- `cloudinterview_upload.py setup` - Configure Cloudflare credentials
- `cloudinterview_upload.py test` - Validate CSV data
- `cloudinterview_upload.py upload` - Upload data to KV

### Individual Scripts
- `upload_to_kv.py` - Core upload functionality with batch processing
- `test_upload.py` - CSV parsing validation
- `setup_env.py` - Cloudflare environment configuration

## 📊 Data Structure

### Individual Problem Entry
```json
{
  "id": 1,
  "difficulty": "Easy",
  "title": "Two Sum",
  "titleSlug": "two-sum",
  "url": "https://leetcode.com/problems/two-sum",
  "description": "<p>Problem description...</p>",
  "solution_code_python": "class Solution:...",
  "metadata": {
    "category": "Array",
    "topics": ["Array", "Hash Table"],
    "hints": ["Use hash map"],
    "acceptance_rate": 46.2,
    "likes": 15000,
    "dislikes": 500
  }
}
```

### Essentials Index
```json
{
  "problems": [
    {
      "id": 1,
      "title": "Two Sum", 
      "difficulty": "Easy",
      "category": "Array",
      "topics": ["Array", "Hash Table"]
    }
  ],
  "count": 2000,
  "last_updated": "timestamp"
}
```

## 🌐 Worker API Example

See `src/api-example.ts` for a complete Worker implementation with:

- **GET /api/problems** - Get all problems (essentials)
- **GET /api/problems/filter** - Filter by difficulty, category, topic
- **GET /api/problem/:id** - Get specific problem
- **GET /api/problem/:id/solution/:language** - Get solution code
- **GET /api/stats** - Dataset statistics
- **POST /api/search** - Search functionality

## 📋 CSV Format Requirements

The CSV file should contain these columns:

| Column | Description |
|--------|-------------|
| `difficulty` | Easy/Medium/Hard |
| `frontendQuestionId` | Problem ID |
| `title` | Problem title |
| `titleSlug` | URL slug |
| `url` | Full problem URL |
| `description` | HTML/markdown description |
| `solution_code_python` | Python solution code |
| `solution_code_java` | Java solution code |
| `solution_code_cpp` | C++ solution code |
| `category` | Problem category |
| `topics` | JSON array of topics |
| `acceptance_rate` | Percentage as string |
| `likes` | Number of likes |
| `dislikes` | Number of dislikes |
| `hints` | JSON array of hints |
| `similar_questions` | JSON array of similar questions |

## 🔧 Configuration

### Environment Variables
```bash
export CF_ACCOUNT_ID="your_account_id"
export CF_API_TOKEN="your_api_token"
export CF_NAMESPACE_ID="your_namespace_id"
```

### Configuration File
After running `python cloudinterview_upload.py setup`, configuration is saved to `config.json`:

```json
{
  "account_id": "your_account_id",
  "api_token": "your_api_token",
  "namespace_id": "your_namespace_id",
  "namespace_title": "LeetCode Problems"
}
```

## 🚀 Deployment

### 1. Upload Data to KV
```bash
python cloudinterview_upload.py full leetcode_problems.csv
```

### 2. Deploy Worker
```bash
wrangler deploy
```

### 3. Test API Endpoints
```bash
# Get all problems
curl https://your-worker.workers.dev/api/problems

# Get specific problem
curl https://your-worker.workers.dev/api/problem/1

# Filter by difficulty
curl "https://your-worker.workers.dev/api/problems/filter?difficulty=Easy"
```

## 📈 Performance Features

- **Batch Processing**: Uploads 50 entries at a time to minimize API calls
- **Progress Tracking**: Real-time progress bars with tqdm
- **Error Handling**: Comprehensive error logging and retry logic
- **Memory Efficient**: Streams CSV data without loading entire file into memory
- **Compact Storage**: Optimized JSON structure for minimal KV storage usage

## 🔍 Monitoring and Debugging

### Logs
- Upload progress logged to `upload.log`
- Error details with timestamps
- Performance statistics

### Validation
- CSV parsing validation before upload
- Data structure validation
- API connectivity testing

### Statistics
```bash
# Get dataset statistics
curl https://your-worker.workers.dev/api/stats
```

## 🛡️ Security

- API tokens never committed to version control
- Support for environment variables
- Secure credential storage in config files
- Optional encryption for sensitive data

## 🐛 Troubleshooting

### Common Issues

1. **API Token Permissions**
   ```
   Error: Insufficient permissions
   Solution: Ensure token has KV:Edit and KV:Read permissions
   ```

2. **Rate Limiting**
   ```
   Error: Too many requests
   Solution: Reduce batch size: --batch-size 25
   ```

3. **Memory Issues**
   ```
   Error: Out of memory
   Solution: Process smaller CSV chunks or increase system memory
   ```

4. **Network Errors**
   ```
   Error: Connection timeout
   Solution: Check internet connection, retry failed uploads
   ```

### Debug Mode
```bash
python upload_to_kv.py --csv leetcode_problems.csv --log-level DEBUG \
  --account-id YOUR_ID --api-token YOUR_TOKEN --namespace-id YOUR_NAMESPACE
```

## 📚 Additional Documentation

- **UPLOAD_README.md** - Detailed upload script documentation
- **src/api-example.ts** - Complete Worker API implementation
- **Cloudflare KV Documentation** - https://developers.cloudflare.com/kv/

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Test changes thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Cloudflare for the Workers and KV platform
- LeetCode for the problem data
- Open source community for excellent Python libraries
