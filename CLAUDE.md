# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReviewMonster is a product intelligence platform that transforms App Store reviews into actionable insights. It uses OpenAI GPT-4o-mini to analyze reviews and generate decision memos, rating-driver analysis, and recommendations.

## Commands

```bash
# Development (auto-reload with nodemon)
npm run dev

# Production
npm start

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Syntax check
node -c api/server.js
```

Server runs on `http://localhost:3000`.

## Architecture

### Core Components

- **api/server.js** - Express API server with all endpoints. CORS configured for `localhost:4000` frontend.

- **Agents/** - Orchestration layer for multi-step analysis workflows:
  - `AgentManager.js` - Central coordinator for all agents
  - `InitAgent.js` - Handles app initialization and review ingestion
  - `CompetitorAgent.js` - Competitor discovery and SWOT analysis
  - `MemoAgent.js` - Generates executive decision memos

- **tools/** - Utility modules for specific tasks:
  - `fetchReviews.js` / `appStoreScraper.js` - App Store review fetching
  - `analyzeReview.js` - AI-powered review analysis
  - `cache.js` - Review analysis caching (in-memory + JSON file)
  - `rawReviewStore.js` - Raw review storage
  - `regressionEngine.js` - Rating driver analysis
  - `releaseTimeline.js` / `impactModel.js` - Version-based analytics
  - `competitorDiscovery.js` / `competitorIngestion.js` - Competitor handling
  - `llm/` - LLM abstraction layer (plug-and-play provider switching)

- **config/** - Configuration files:
  - `llm.config.js` - LLM provider configuration (default provider, API keys, models)

- **data/** - JSON file storage for reviews, cache, and analysis results

### Data Flow

1. `/apps/metadata` fetches app info from iTunes API
2. `/init` downloads reviews via `appStoreScraper` and stores in `rawReviewStore`
3. Reviews are analyzed via `analyzeReview` (uses LLM abstraction layer) and cached
4. Endpoints like `/overview`, `/your-product` aggregate cached analysis

### Environment Variables

```
# LLM Provider (default: openai)
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google (optional)
GOOGLE_API_KEY=...
GOOGLE_MODEL=gemini-1.5-flash
```

### LLM Abstraction Layer

The app uses a plug-and-play LLM provider system. To switch providers:

1. Set `LLM_PROVIDER` env var to: `openai`, `anthropic`, or `google`
2. Ensure the corresponding API key is set
3. Restart the server

Provider-specific models are configured in `config/llm.config.js` with tiers:
- `fast` - Optimized for speed (gpt-4o-mini, claude-3-5-haiku, gemini-1.5-flash)
- `standard` - Balanced (gpt-4o, claude-3-5-sonnet, gemini-1.5-pro)
- `advanced` - Best quality (gpt-4-turbo, claude-3-opus, gemini-1.5-pro)

### Key Patterns

- Review analysis results are cached with `cache.makeReviewKey(review)` as the key
- Analysis results are JSON-stringified when stored in cache
- Most endpoints require `/init` to be run first to populate review data
- Competitor data stored in `data/competitive_dataset.json`
- **Cache-first by default**: All LLM calls read from cache by default. Pass `bypassCache: true` to force fresh LLM calls

## API Endpoints

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/llm/info` | Get current LLM provider info and available providers |

### Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apps/metadata` | Fetch app metadata from App Store. Body: `{ appId, country? }` |
| `POST` | `/init` | Download and analyze reviews (async). Body: `{ refresh?: boolean, async?: boolean, bypassCache?: boolean }` |
| `GET` | `/init/status` | Check init progress. Returns `{ running, progress, total, percentage, lastResult }` |

### Core Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/overview` | Dashboard with executive summary, metrics, top issues, alerts |
| `GET` | `/your-product` | Deep dive into issues, feature requests, strengths with severity |
| `GET` | `/yearly-report` | Generate yearly analysis report. Query: `?bypassCache=true` to force fresh LLM calls |
| `GET` | `/regression-tree` | Rating driver regression analysis. Query: `?bypassCache=true` |
| `GET` | `/release-timeline` | Version-by-version sentiment analysis. Query: `?bypassCache=true` |
| `GET` | `/impact-model` | Predictive impact analysis with priorities. Query: `?bypassCache=true` |
| `POST` | `/run-agent` | Run analysis agent. Body: `{ days?: number, bypassCache?: boolean }` |

### Evidence & Queries

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/evidence/:type/:item` | Get review evidence. Types: `issue`, `weakness`, `request`, `opportunity`, `strength`, `praise`. Query: `?competitorId=` for competitor data |
| `POST` | `/query` | Natural language query. Body: `{ query: string, bypassCache?: boolean }` |

### Competitors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/competitors/init` | Discover competitors. Body: `{ ourAppId?, country?, k? }` |
| `POST` | `/competitors/run` | Fetch and analyze competitor reviews. Body: `{ mainApp: { appId }, competitorIds: [], days?, bypassCache?: boolean }` |
| `POST` | `/competitors/compare` | Generate SWOT comparison. Body: `{ mainApp: { appId }, competitorIds: [], days? }` |

### Example Usage

```bash
# 1. Fetch app metadata
curl -X POST http://localhost:3000/apps/metadata \
  -H "Content-Type: application/json" \
  -d '{"appId": "1081530898"}'

# 2. Initialize (download & analyze reviews)
curl -X POST http://localhost:3000/init \
  -H "Content-Type: application/json" \
  -d '{"refresh": true}'

# 3. Get dashboard overview
curl http://localhost:3000/overview

# 4. Get evidence for an issue
curl http://localhost:3000/evidence/issue/login_bug

# 5. Ask a natural language question
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the top complaints?"}'
```
