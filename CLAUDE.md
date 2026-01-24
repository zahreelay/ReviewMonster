# CLAUDE.md - AI Assistant Guide for ReviewMonster

> **Last Updated:** January 24, 2026
> **Purpose:** This document provides comprehensive guidance for AI assistants (like Claude) working with the ReviewMonster codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Architecture](#codebase-architecture)
3. [Key Design Patterns](#key-design-patterns)
4. [Development Conventions](#development-conventions)
5. [File Organization](#file-organization)
6. [Working with the Codebase](#working-with-the-codebase)
7. [Testing & Validation](#testing--validation)
8. [Git Workflow](#git-workflow)
9. [Common Tasks](#common-tasks)
10. [Important Constraints](#important-constraints)
11. [Future Roadmap Context](#future-roadmap-context)

---

## Project Overview

### What is ReviewMonster?

**ReviewMonster** is a Product Intelligence Platform that transforms App Store reviews into actionable business insights. The core mission is: *"We don't show you review data. We tell you what to do about it."*

### Key Value Propositions
- **Evidence-based decision memos** (not just dashboards)
- **Rating driver analysis** (regression engine identifies what impacts ratings)
- **Executive summaries** with concrete recommendations
- **Product recommendations** backed by user feedback
- **SWOT competitive analysis** with evidence from competitor reviews
- **Natural language query interface** for exploring insights

### Technology Stack

```
Runtime:       Node.js v18+ (v22+ recommended)
Framework:     Express.js v5.2.1
Language:      Vanilla JavaScript (no TypeScript)
AI/LLM:        OpenAI GPT-4.1-mini (review analysis), GPT-4o-mini (queries)
Data Source:   Apple App Store RSS API, iTunes Search API
Persistence:   File-based JSON storage (no database)
Dependencies:  cors, dotenv, openai SDK
Dev Tools:     nodemon (auto-reload)
```

---

## Codebase Architecture

### Directory Structure

```
ReviewMonster/
├── api/
│   └── server.js              # Express API server (main entry point)
│
├── Agents/                     # Agent orchestration layer
│   ├── AgentManager.js        # Master coordinator for all agents
│   ├── InitAgent.js           # App initialization & onboarding
│   ├── ReviewAnalysisAgent.js # Fetches and analyzes reviews
│   ├── CompetitorAgent.js     # Competitor discovery & analysis
│   ├── MemoAgent.js           # Generates executive memos
│   └── YearlyReportAgent.js   # Annual insights generation
│
├── tools/                      # Core business logic & utilities
│   ├── analyzeReview.js       # OpenAI GPT review analysis
│   ├── fetchReviews.js        # Apple RSS API integration
│   ├── appStoreScraper.js     # App Store scraper
│   ├── cache.js               # SHA256-based analysis cache
│   ├── generateMemo.js        # Executive memo generation
│   ├── competitorDiscovery.js # App Store competitor search
│   ├── competitorIngestion.js # Competitor review fetching
│   ├── regressionEngine.js    # Rating-driver analysis
│   ├── releaseTimeline.js     # Version-by-version timeline
│   ├── impactModel.js         # Fix priority scoring
│   ├── reviewSignalExtractor.js # Signal extraction utilities
│   ├── rawReviewStore.js      # File-based review persistence
│   └── httpCache.js           # HTTP response caching
│
├── data/                       # JSON file-based data storage
│   ├── raw_reviews.json       # Master review store
│   ├── agent_cache.json       # Analysis cache (322KB)
│   ├── competitive_*.json     # Competitor data files
│   ├── competitors.json       # Discovered competitors
│   └── memory.json            # System memory/state
│
├── package.json               # NPM dependencies & scripts
├── .env                       # Environment configuration
├── README.md                  # User-facing documentation
├── API_DOCS.md                # Complete API reference
└── verify_cache.js            # Cache verification utility
```

### Architectural Flow

```
USER REQUEST (HTTP)
    ↓
Express Route Handler (api/server.js)
    ↓
Agent Manager / Specific Agent
    ↓
Tools Layer:
  ├─ fetchReviews() → iTunes RSS API
  ├─ analyzeReview() → OpenAI GPT-4
  ├─ cache operations
  └─ data aggregation
    ↓
Data Processing:
  ├─ Sentiment classification
  ├─ Issue extraction
  ├─ Severity calculation
  ├─ Regression analysis
  └─ Impact modeling
    ↓
JSON Response → Client
```

---

## Key Design Patterns

### 1. Agent-Based Architecture

The system uses specialized agents coordinated by `AgentManager`. Each agent is responsible for a specific domain:

```javascript
// Example: AgentManager coordinates all agents
class AgentManager {
    constructor({ fetchReviews, analyzeReview, generateMemo, cache }) {
        this.reviewAgent = new ReviewAnalysisAgent({ fetchReviews, analyzeReview, cache });
        this.memoAgent = new MemoAgent({ generateMemo, cache });
        this.yearlyAgent = new YearlyReportAgent({ rawStore, analyzeReview, cache, generateMemo });
        this.competitorAgent = new CompetitorAgent({ fetchReviews, analyzeReview, cache });
        this.cache = cache;
    }
}
```

**When modifying agents:**
- Each agent should receive dependencies via constructor (dependency injection)
- Never use global state or require modules at runtime
- Maintain single responsibility principle

### 2. Dependency Injection Pattern

All components receive their dependencies through constructors, making code testable and reusable:

```javascript
// GOOD: Dependencies injected
new ReviewAnalysisAgent({ fetchReviews, analyzeReview, cache })

// BAD: Direct requires inside class methods
class Agent {
    async run() {
        const fetchReviews = require('./fetchReviews'); // ❌ Don't do this
    }
}
```

### 3. Three-Tier Caching Strategy

Caching is critical to minimize OpenAI API costs:

1. **Review Analysis Cache** (`tools/cache.js`)
   - Key: SHA256 hash of `text|rating|version`
   - Stores GPT analysis results
   - File: `data/agent_cache.json`

2. **Memo Cache**
   - Key: SHA256 hash of analyzed review fingerprint
   - Stores executive memos
   - Stored in same `agent_cache.json`

3. **HTTP Cache** (`tools/httpCache.js`)
   - Caches iTunes API responses
   - Reduces external API calls

**Cache Key Generation Example:**
```javascript
// From tools/cache.js:16-21
function makeReviewKey(review) {
    return crypto
        .createHash("sha256")
        .update(`${review.text}|${review.rating}|${review.version}`)
        .digest("hex");
}
```

**When working with cache:**
- Always check cache before calling OpenAI API
- Use `cache.get(key)` and `cache.set(key, value)`
- JSON.parse() cached results (they're stored as strings)
- Never bypass cache without user explicitly requesting `refresh: true`

### 4. File-Based Data Persistence

The system uses JSON files in the `data/` directory instead of a database:

```javascript
// Example from tools/rawReviewStore.js
const PATH = path.join(__dirname, "../data/raw_reviews.json");

function saveReviews(reviews) {
    fs.writeFileSync(PATH, JSON.stringify(reviews, null, 2));
}

function getReviews() {
    if (!fs.existsSync(PATH)) return [];
    return JSON.parse(fs.readFileSync(PATH, "utf-8"));
}
```

**Important considerations:**
- All writes are synchronous (blocking)
- No transactions or concurrent write protection
- Files can grow large (raw_reviews.json ~168KB)
- Not suitable for horizontal scaling

---

## Development Conventions

### Code Style

1. **Module System:** CommonJS (`require`/`module.exports`), not ES6 modules
2. **Async/Await:** Preferred over callbacks or raw promises
3. **Error Handling:** Use try-catch blocks, throw descriptive errors
4. **Naming Conventions:**
   - Files: camelCase (e.g., `fetchReviews.js`)
   - Classes: PascalCase (e.g., `AgentManager`)
   - Functions: camelCase (e.g., `buildRegressionTree`)
   - Constants: UPPER_SNAKE_CASE (e.g., `PATH`, `OPENAI_API_KEY`)

### Data Models

**Review Object (Raw):**
```javascript
{
    text: string,      // Review content
    title: string,     // User's title
    date: string,      // ISO timestamp
    user: string,      // Author name
    version: string,   // App version (e.g., "1.2.3")
    rating: number     // 1-5 stars
}
```

**Analysis Result (from OpenAI):**
```javascript
{
    intent: "complaint" | "feature_request" | "praise",
    issues: string[],  // Snake_case identifiers (e.g., ["login_bug", "app_crashes"])
    summary: string    // Executive summary of the review
}
```

**Issue Details (Aggregated):**
```javascript
{
    text: string,             // Issue identifier
    count: number,            // Number of mentions
    severity: "critical" | "high" | "medium" | "low",
    avgRating: number,        // Average rating for reviews mentioning this issue
    evidence: Review[]        // Sample reviews (max 10)
}
```

### API Response Format

All API endpoints return JSON. Use consistent response structures:

```javascript
// Success response
res.json({
    // Data payload
    totalReviews: 1234,
    analyzed: [...],
    generatedAt: new Date().toISOString()
});

// Error response (api/server.js pattern)
res.status(500).json({ error: error.message });
```

### Environment Configuration

Environment variables are loaded from `.env` file:

```env
OPENAI_API_KEY=sk-...
```

**Access in code:**
```javascript
require('dotenv').config();
const apiKey = process.env.OPENAI_API_KEY;
```

**⚠️ SECURITY NOTE:** The `.env` file is currently in the repository (security risk for production). This should be added to `.gitignore` and managed via environment variables in production.

---

## File Organization

### Critical Files (Modify with Caution)

| File | Purpose | Importance |
|------|---------|------------|
| `api/server.js` | Main Express server, all route definitions | 🔴 Critical |
| `Agents/AgentManager.js` | Orchestrates all agents, central coordinator | 🔴 Critical |
| `tools/cache.js` | Cache key generation and storage | 🔴 Critical |
| `tools/analyzeReview.js` | OpenAI GPT integration for review analysis | 🔴 Critical |
| `tools/fetchReviews.js` | Apple RSS API integration | 🟡 Important |
| `data/agent_cache.json` | Cached analysis results (322KB) | 🟡 Important |
| `data/raw_reviews.json` | Master review storage (168KB) | 🟡 Important |

### Safe to Modify

| File | Purpose | Notes |
|------|---------|-------|
| `tools/regressionEngine.js` | Rating driver analysis algorithm | Business logic |
| `tools/releaseTimeline.js` | Version-by-version analysis | Business logic |
| `tools/impactModel.js` | Fix priority scoring | Business logic |
| `tools/generateMemo.js` | Executive memo generation | Prompt engineering |
| `verify_cache.js` | Cache validation utility | Standalone script |

### Hardcoded Values to Be Aware Of

⚠️ These values are currently hardcoded and will be made dynamic in V1.1:

1. **App Store ID**
   - Default: `1081530898`
   - Locations: `tools/fetchReviews.js:4`, `tools/appStoreScraper.js:3`
   - Impact: Each instance is tied to a single app

2. **CORS Origin**
   - Hardcoded: `http://localhost:4000`
   - Location: `api/server.js` (CORS configuration)
   - Impact: Only allows requests from localhost:4000

3. **Server Port**
   - Hardcoded: `3000`
   - Location: `api/server.js`
   - Impact: Server always listens on port 3000

---

## Working with the Codebase

### Setting Up Development Environment

```bash
# Clone repository
git clone https://github.com/zahreelay/ReviewMonster.git
cd ReviewMonster

# Install dependencies
npm install

# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Start development server (auto-reload)
npm run dev

# Start production server
npm start
```

### Adding a New API Endpoint

1. **Define route in `api/server.js`:**
```javascript
app.get('/your-new-endpoint', async (req, res) => {
    try {
        const result = await agentManager.yourNewMethod();
        res.json(result);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});
```

2. **Add method to `AgentManager` (if needed):**
```javascript
// In Agents/AgentManager.js
async yourNewMethod() {
    // Implementation
}
```

3. **Create tool function (if needed):**
```javascript
// In tools/yourNewTool.js
async function yourNewTool(data) {
    // Implementation
}

module.exports = { yourNewTool };
```

4. **Update API documentation:**
   - Add endpoint description to `API_DOCS.md`
   - Include request/response examples

### Modifying OpenAI Prompts

OpenAI prompts are embedded in tool functions. Key locations:

1. **Review Analysis** (`tools/analyzeReview.js`)
   - Prompt: Asks GPT to categorize intent, extract issues, generate summary
   - Response format: JSON schema with `intent`, `issues`, `summary`

2. **Memo Generation** (`tools/generateMemo.js`)
   - Prompt: Generates executive memos from aggregated data
   - Response format: Markdown-formatted text

3. **Natural Language Query** (`api/server.js` - `/query` endpoint)
   - Prompt: Answers user questions based on review data
   - Response format: Plain text answer

**Best practices:**
- Use structured output with JSON schema where possible
- Be explicit about desired format
- Include examples in prompts
- Test with various inputs to validate consistency

### Working with Cache

**Check if analysis exists:**
```javascript
const key = cache.makeReviewKey(review);
let analysis = cache.get(key);

if (analysis) {
    analysis = JSON.parse(analysis); // Cache stores as string
} else {
    analysis = await analyzeReview(review);
    cache.set(key, JSON.stringify(analysis));
}
```

**Force cache refresh:**
```javascript
// User can pass refresh: true in /init request
if (refresh) {
    // Skip cache, re-analyze all reviews
}
```

**Verify cache integrity:**
```bash
node verify_cache.js
```

---

## Testing & Validation

### Current State

⚠️ **No formal testing framework is currently implemented.**

- Test command: `npm test` → Returns error
- No Jest, Mocha, or test runners configured
- No unit tests for agents or tools
- No integration tests for API endpoints
- No E2E test suite

### Manual Testing

**Syntax check:**
```bash
node -c api/server.js
```

**Manual API testing with curl:**
```bash
# Test onboarding flow
curl -X POST http://localhost:3000/apps/metadata \
  -H "Content-Type: application/json" \
  -d '{"appId": "1081530898"}'

curl -X POST http://localhost:3000/init \
  -H "Content-Type: application/json" \
  -d '{"refresh": true}'

# Test overview endpoint
curl http://localhost:3000/overview

# Test evidence endpoint
curl http://localhost:3000/evidence/issue/login_bug

# Test query endpoint
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the top complaints?"}'
```

### Validation Checklist

When making changes, validate:

- [ ] Server starts without errors (`npm run dev`)
- [ ] Endpoints return expected JSON structure
- [ ] Cache is being used (check `data/agent_cache.json` size)
- [ ] No console errors during operation
- [ ] OpenAI API calls succeed (check API key)
- [ ] Data files are written correctly (`data/` directory)

---

## Git Workflow

### Branch Strategy

The repository uses feature branches for development:

- **Main branch:** `main` or `master` (stable releases)
- **Feature branches:** `claude/feature-name-<session-id>`
- **Example:** `claude/claude-md-mksg0gupme9r3ysn-kXZ02`

### Committing Changes

When asked to commit changes:

1. **Check status and diff:**
```bash
git status           # See all changes
git diff             # See unstaged changes
git diff --staged    # See staged changes
```

2. **Review recent commits for style:**
```bash
git log --oneline -5
```

3. **Stage relevant files:**
```bash
git add path/to/file.js
```

4. **Create commit with descriptive message:**
```bash
git commit -m "$(cat <<'EOF'
Add CLAUDE.md with comprehensive codebase documentation

- Document architecture patterns (Agent-based, DI, caching)
- Explain development conventions and file organization
- Provide AI assistant guidance for working with codebase
- Include testing, Git workflow, and common tasks
EOF
)"
```

5. **Push to remote:**
```bash
git push -u origin claude/claude-md-mksg0gupme9r3ysn-kXZ02
```

### Creating Pull Requests

Use GitHub CLI (`gh`) for PR creation:

```bash
# Create PR with description
gh pr create --title "Add CLAUDE.md documentation" --body "$(cat <<'EOF'
## Summary
- Comprehensive codebase documentation for AI assistants
- Covers architecture, conventions, and development workflows

## Test plan
- [x] Verify all file paths are accurate
- [x] Validate code examples
- [x] Ensure markdown formatting is correct
EOF
)"
```

---

## Common Tasks

### Task: Add a New Agent

1. Create new agent file in `Agents/` directory:
```javascript
// Agents/YourNewAgent.js
class YourNewAgent {
    constructor({ dependency1, dependency2, cache }) {
        this.dependency1 = dependency1;
        this.dependency2 = dependency2;
        this.cache = cache;
    }

    async run(input) {
        // Implementation
    }
}

module.exports = { YourNewAgent };
```

2. Register in `AgentManager`:
```javascript
// Agents/AgentManager.js
const { YourNewAgent } = require("./YourNewAgent");

class AgentManager {
    constructor({ fetchReviews, analyzeReview, generateMemo, cache }) {
        // ... existing agents
        this.yourNewAgent = new YourNewAgent({
            dependency1: yourDep1,
            dependency2: yourDep2,
            cache
        });
    }

    async runYourNewAgent(input) {
        return await this.yourNewAgent.run(input);
    }
}
```

3. Add endpoint in `api/server.js`:
```javascript
app.post('/your-new-feature', async (req, res) => {
    try {
        const result = await agentManager.runYourNewAgent(req.body);
        res.json(result);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});
```

### Task: Modify Review Analysis Logic

1. Locate `tools/analyzeReview.js`
2. Modify the OpenAI prompt or response parsing
3. **Important:** This will invalidate existing cache
4. Consider adding a new cache version to avoid conflicts
5. Test with a sample review to validate output format

### Task: Add New Data Source (Beyond Apple App Store)

1. Create new fetcher in `tools/` (e.g., `fetchGooglePlayReviews.js`)
2. Normalize data to match existing Review object format
3. Inject into relevant agents via constructor
4. Update `AgentManager` to support multiple sources
5. Add configuration to distinguish between sources

### Task: Implement Database Persistence

**Current state:** File-based JSON storage
**Migration path for V1.1+:**

1. Choose database (PostgreSQL, MongoDB, SQLite)
2. Create schema/models matching existing data structures
3. Replace `rawReviewStore` with database operations
4. Replace `cache.js` file operations with database queries
5. Add connection pooling and error handling
6. Migrate existing JSON data to database
7. Update all agents to use new persistence layer

**Affected files:**
- `tools/rawReviewStore.js` (replace entirely)
- `tools/cache.js` (replace file operations)
- `Agents/*.js` (update to use new store)
- All `data/*.json` files (migrate to DB)

---

## Important Constraints

### Rate Limits & API Costs

1. **OpenAI API:**
   - Cost per review analysis: ~$0.002-0.005
   - Batch processing for efficiency
   - Always use cache to avoid redundant calls
   - GPT-4.1-mini for analysis, GPT-4o-mini for queries

2. **Apple RSS API:**
   - May rate-limit excessive requests
   - Implement exponential backoff if hitting limits
   - Not currently implemented (TODO for production)

3. **File I/O:**
   - Synchronous writes can block event loop
   - Large JSON files (>1MB) may cause performance issues
   - Consider streaming for large datasets in future

### Security Considerations

1. **API Key Exposure:**
   - `.env` file currently in repository
   - Should be added to `.gitignore`
   - Use environment variables in production

2. **Input Validation:**
   - Limited validation on API endpoints
   - No sanitization of user queries
   - No rate limiting on query endpoint

3. **CORS Configuration:**
   - Currently allows only `http://localhost:4000`
   - Make configurable for production deployments

### Scalability Limitations

1. **Single App Instance:**
   - Each instance tied to one App Store ID
   - No multi-user or multi-app support (planned for V1.1)

2. **File-Based Storage:**
   - Not suitable for horizontal scaling
   - No concurrent write protection
   - Single point of failure

3. **Memory Constraints:**
   - All reviews loaded into memory for processing
   - Large apps (10K+ reviews) may cause issues

---

## Future Roadmap Context

Understanding planned features helps make forward-compatible changes:

### V1.1 - High Priority
- **Multi-app workspace support** → Refactor hardcoded App ID
- **Manual competitor management** → CRUD operations for competitors
- **Time period comparison** → Add date range filters
- **Export to PDF/CSV** → Add export utilities
- **Smart alerts configuration** → Alert rules engine

### V1.2 - Medium Priority
- **Advanced filters** → Filter UI and backend support
- **Release planning assistant** → Predictive insights
- **Competitive trends timeline** → Historical competitor data
- **Review search & custom tagging** → Search indexing
- **Customizable dashboard widgets** → Modular dashboard

### V2.0 - Future
- **Predictive intelligence** → Sentiment forecasting models
- **User cohort analysis** → Segment reviews by user type
- **Automated response suggestions** → GPT-generated responses
- **Google Play Store support** → Additional data source
- **Team collaboration features** → Multi-user access
- **Integrations** → Jira, Linear, Amplitude, Zendesk

**When making changes:**
- Consider future multi-app support
- Design for database migration
- Keep APIs flexible for new data sources
- Document breaking changes

---

## Quick Reference Commands

### Development
```bash
npm install              # Install dependencies
npm run dev              # Start with auto-reload
npm start                # Start production server
node -c api/server.js    # Syntax check
node verify_cache.js     # Verify cache integrity
```

### Git Operations
```bash
git status                                    # Check status
git add .                                     # Stage all changes
git commit -m "Description"                   # Commit changes
git push -u origin claude/branch-name         # Push to remote
gh pr create --title "Title" --body "Body"    # Create PR
```

### Testing APIs
```bash
curl -X POST http://localhost:3000/init -H "Content-Type: application/json" -d '{"refresh":true}'
curl http://localhost:3000/overview
curl http://localhost:3000/evidence/issue/login_bug
curl -X POST http://localhost:3000/query -H "Content-Type: application/json" -d '{"query":"What are the top complaints?"}'
```

---

## Additional Resources

- **User Documentation:** [README.md](./README.md)
- **API Reference:** [API_DOCS.md](./API_DOCS.md)
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Express.js Docs:** https://expressjs.com/
- **Apple RSS Feeds:** https://rss.applemarketingtools.com/

---

## Document Maintenance

This document should be updated when:
- New architectural patterns are introduced
- Major refactoring occurs
- Development conventions change
- New critical files are added
- Security considerations evolve
- Roadmap priorities shift

**Last reviewed:** January 24, 2026
**Next review:** When V1.1 features are implemented

---

**Built with ❤️ for AI assistants helping Product Managers build better products.**
