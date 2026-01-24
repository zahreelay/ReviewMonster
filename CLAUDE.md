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

- **data/** - JSON file storage for reviews, cache, and analysis results

### Data Flow

1. `/apps/metadata` fetches app info from iTunes API
2. `/init` downloads reviews via `appStoreScraper` and stores in `rawReviewStore`
3. Reviews are analyzed via `analyzeReview` (OpenAI) and cached
4. Endpoints like `/overview`, `/your-product` aggregate cached analysis

### Environment Variables

```
OPENAI_API_KEY=sk-...
```

### Key Patterns

- Review analysis results are cached with `cache.makeReviewKey(review)` as the key
- Analysis results are JSON-stringified when stored in cache
- Most endpoints require `/init` to be run first to populate review data
- Competitor data stored in `data/competitive_dataset.json`
