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

- **routes/** - API route modules:
  - `apps.routes.js` - Phase 1A multi-app endpoints (`/api/apps/:appId/*`)

- **tools/** - Utility modules for specific tasks:
  - `fetchReviews.js` / `appStoreScraper.js` - App Store review fetching (supports any appId)
  - `analyzeReview.js` - AI-powered review analysis
  - `cache.js` - Review analysis caching (in-memory + JSON file)
  - `rawReviewStore.js` - Raw review storage (legacy single-app)
  - `appStorage.js` - Multi-app data storage (`/data/apps/{appId}/`)
  - `insightsGenerator.js` - Generates structured insights (issues, requests, strengths, rating history)
  - `regressionEngine.js` - Rating driver analysis
  - `releaseTimeline.js` / `impactModel.js` - Version-based analytics
  - `competitorDiscovery.js` / `competitorIngestion.js` - Competitor handling
  - `llm/` - LLM abstraction layer (plug-and-play provider switching)

- **config/** - Configuration files:
  - `llm.config.js` - LLM provider configuration (default provider, API keys, models)

- **data/** - JSON file storage for reviews, cache, and analysis results

### Data Flow

#### Phase 1A Multi-App Flow (Recommended)
1. `POST /api/apps/:appId/init` fetches app metadata from iTunes API
2. Reviews are scraped via `appStoreScraper(appId)` and stored in `appStorage` (`/data/apps/{appId}/`)
3. Reviews are analyzed via `analyzeReview` (LLM) and cached
4. `insightsGenerator` creates structured insights (issues, requests, strengths, rating history)
5. Endpoints like `/api/apps/:appId/overview`, `/api/apps/:appId/issues` serve the data

#### Legacy Single-App Flow
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

### Phase 1A: Multi-App Endpoints (`/api/apps`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/apps` | List all analyzed apps |
| `POST` | `/api/apps/:appId/init` | Initialize analysis for an app. Body: `{ refresh?: boolean, bypassCache?: boolean }` |
| `GET` | `/api/apps/:appId/init/status` | Check init progress for an app |
| `GET` | `/api/apps/:appId/overview` | Dashboard overview with metrics, rating history, memo |
| `GET` | `/api/apps/:appId/issues` | List all issues with severity |
| `GET` | `/api/apps/:appId/issues/:issueId` | Issue deep-dive with timeline, impact, recommendations |
| `GET` | `/api/apps/:appId/requests` | List feature requests with demand ranking |
| `GET` | `/api/apps/:appId/strengths` | List all strengths |
| `GET` | `/api/apps/:appId/regression-timeline` | Version-wise issue tracking. Query: `?view=version|monthly` |
| `POST` | `/api/apps/:appId/query` | Natural language query. Body: `{ query: string, bypassCache?: boolean }` |

### Legacy Endpoints (Single-App Mode)

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

#### Phase 1A Multi-App API (Recommended)

```bash
# 1. Initialize analysis for any app (async, returns immediately)
curl -X POST http://localhost:3000/api/apps/1081530898/init \
  -H "Content-Type: application/json" \
  -d '{"refresh": true}'

# 2. Poll for init progress
curl http://localhost:3000/api/apps/1081530898/init/status

# 3. Get dashboard overview
curl http://localhost:3000/api/apps/1081530898/overview

# 4. Get all issues with severity
curl http://localhost:3000/api/apps/1081530898/issues

# 5. Deep-dive into a specific issue
curl http://localhost:3000/api/apps/1081530898/issues/login_fails

# 6. Get feature requests
curl http://localhost:3000/api/apps/1081530898/requests

# 7. Get regression timeline (version-wise)
curl "http://localhost:3000/api/apps/1081530898/regression-timeline?view=version"

# 8. Ask natural language question
curl -X POST http://localhost:3000/api/apps/1081530898/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are users saying about login issues?"}'

# 9. List all analyzed apps
curl http://localhost:3000/api/apps
```

#### Legacy Single-App API

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
### Updated PRD ####
# ReviewMonster PRD v2.0
## App Store Intelligence Platform - Revised Scope

**Version:** 2.0 - Expanded MVP  
**Last Updated:** January 25, 2026  
**Owner:** Abhishek (Solo Founder)  
**Goal:** Build comprehensive intelligence tool, validate with 10-20 PMs, then scale

---

## 🎯 Mission Statement

**Build a comprehensive app store intelligence platform that gives product managers actionable insights from reviews AND competitive landscape - saving hours of manual analysis.**

**Success Criteria:** 10-20 PMs using it weekly and saying "this saved me hours AND gave me strategic insights I couldn't get elsewhere."

---

## 💡 The Big Idea

**"We don't just show you review data. We give you strategic intelligence to ship better products."**

**Three pillars:**
1. **Own App Intelligence:** What's broken, what's working, what to build next
2. **Competitive Intelligence:** How you stack up, what competitors are doing right/wrong
3. **Strategic Roadmap:** Data-driven recommendations from reviews + competitive analysis

---

## ⚠️ CRITICAL: Scope Management

### The Problem We Discovered
The original lean PRD and the requirements document have significantly different scopes. The lean PRD focused on single-app analysis with no competitors (4-6 week build). The requirements add:
- Competitor discovery and analysis
- SWOT comparisons
- Regression timelines
- Yearly reports
- JIRA integration foundation

### Our Solution: Phased MVP
We'll build in **two distinct phases** with clear validation gates:

**Phase 1A (Weeks 1-4):** Core intelligence engine - single app only
**Phase 1B (Weeks 5-8):** Competitive intelligence layer
**Validation Gate:** After Phase 1B, assess if we continue
**Phase 2:** Multi-tenancy, auth, MongoDB (only if validated)

---

## 🚀 Phase 1A: Core Intelligence (Weeks 1-4)

### Scope
**Single app analysis with The New Yorker iOS app as test case**

### What We're Building

**Features:**
1. **Onboarding:** User enters App Store ID → System fetches 1 year of reviews
2. **Dashboard:** Shows app metadata, rating trends, key metrics
3. **Basic Insights:** Issues, feature requests, strengths with evidence
4. **Regression Timeline:** Version-wise issue tracking with rating correlation
5. **Issue Deep-Dive:** Drill-down into each issue with timeline and impact
6. **Natural Language Queries:** Ask questions about the reviews

### User Flow

```
1. Onboarding Page
   ├─ Input: App Store ID (with helper text on how to find it)
   ├─ Click "Analyze"
   └─ Background Processing:
      ├─ Fetch metadata
      ├─ Scrape 1 year of reviews
      └─ Show loader with progress
      
2. Redirect to Dashboard (after data loaded)
   ├─ Display: App icon, name, ratings, review count
   ├─ Background Processing (LLM calls):
   │  ├─ Generate insights summary
   │  ├─ Build regression timeline
   │  └─ Analyze issue details
   └─ Show tabs with loading states

3. Dashboard Tabs
   ├─ Overview (default)
   │  ├─ App metadata card
   │  ├─ Rating trends chart
   │  ├─ Quick insights summary
   │  └─ Top 3 issues/requests/strengths
   ├─ Issues
   │  ├─ List of all issues with severity
   │  ├─ Click → Deep-dive modal
   │  └─ Deep-dive shows: timeline, rating impact, evidence
   ├─ Feature Requests
   │  └─ Ranked by demand with supporting reviews
   ├─ Regression Timeline
   │  ├─ Version-wise timeline
   │  ├─ Monthly view
   │  └─ Rating correlation chart
   └─ Query Console
      ├─ Natural language input
      └─ AI-powered answers with sources
```

### No Login/Auth for Phase 1A
- Hardcoded to analyze The New Yorker app (ID: predetermined)
- Results stored in JSON files locally
- No user accounts, no database

---

## 🚀 Phase 1B: Competitive Intelligence (Weeks 5-8)

### Scope
**Add competitor discovery and comparative analysis**

### What We're Building

**New Features:**
1. **Competitor Discovery:** Automatically find top 10 competitors
2. **Competitor Data Collection:** Scrape reviews for top 3 competitors
3. **SWOT Analysis:** Strengths, weaknesses, opportunities, threats
4. **Feature Comparison:** Side-by-side feature matrix
5. **Strategic Recommendations:** AI-generated roadmap based on own + competitor insights

### User Flow Updates

```
2. Onboarding (Updated)
   ├─ Input: App Store ID
   ├─ Click "Analyze"
   └─ Background Processing:
      ├─ Fetch metadata
      ├─ Scrape 1 year of reviews (own app)
      ├─ ✨ NEW: Discover top 10 competitors
      └─ ✨ NEW: Scrape top 3 competitors' reviews (1 year)

3. Dashboard (New Tabs)
   ├─ ... (all Phase 1A tabs)
   ├─ ✨ Competitive Analysis
   │  ├─ Rating trends: Own app vs 3 competitors (chart)
   │  ├─ Feature comparison matrix
   │  ├─ SWOT analysis card
   │  └─ Opportunity areas
   └─ ✨ Recommended Roadmap
      ├─ Prioritized recommendations
      ├─ Based on: Own issues + competitor strengths
      └─ Evidence from reviews only
```

### API Changes

```javascript
// Phase 1A: Single app
POST /api/init
Body: { "appId": "123456789", "refresh": false }
Response: { "status": "analyzing", "progress": {...} }

// Phase 1B: With competitors
POST /api/init
Body: { 
  "appId": "123456789", 
  "refresh": false,
  "includeCompetitors": true  // ✨ NEW
}
Response: { 
  "status": "analyzing", 
  "progress": {...},
  "competitors": [...]  // ✨ NEW
}
```

---

## 🛠️ Tech Stack (Updated)

### Backend
- **Node.js + Express** - REST API
- **Storage:** JSON files (with clear migration path to MongoDB)
  - `/data/apps/{app_id}/`
    - `metadata.json`
    - `reviews.json`
    - `insights.json`
    - `regression.json` ✨ NEW
    - `competitors.json` ✨ NEW (Phase 1B)
    - `swot.json` ✨ NEW (Phase 1B)
    - `roadmap.json` ✨ NEW (Phase 1B)
- **AI:** OpenAI GPT-4o-mini (with LLM abstraction layer) ✨ NEW
- **Caching:** 
  - LLM responses cached by default (can bypass with `?refresh=true`)
  - HTTP requests cached with 24-hour TTL
- **Hosting:** Render.com free tier or Railway

### Frontend
- **React** with Vite
- **Tailwind CSS** (for rapid UI development)
- **Chart.js** - For rating trends, timelines
- **React Router** - Multi-tab navigation
- **Hosting:** Vercel free tier

### Data Sources
- **Apple App Store RSS Feed** (reviews)
- **iTunes API** (metadata, app info)
- **Competitor Discovery:** App Store search API or manual curated list

### Cost Estimate (First 3 Months)
| Item | Cost |
|------|------|
| Vercel (frontend) | $0 (free tier) |
| Render/Railway (backend) | $0 (free tier) |
| OpenAI API (with caching) | ~$30-50/month |
| Domain (optional) | $12/year |
| **Total Monthly** | **~$30-50** |

**With caching, LLM costs should stay manageable even with competitor analysis.**

---

## 📋 Feature Specifications

### Feature 1: Enhanced Onboarding

**UI Design:**
```
┌──────────────────────────────────────────┐
│ ReviewMonster                            │
├──────────────────────────────────────────┤
│                                          │
│  📱 Analyze Your App                     │
│                                          │
│  App Store ID:                           │
│  [_________________]                     │
│                                          │
│  ℹ️  How to find your App Store ID:      │
│  1. Open your app in App Store           │
│  2. Copy the number from URL             │
│  Example: id123456789                    │
│                                          │
│  [Analyze App]                           │
│                                          │
└──────────────────────────────────────────┘
```

**After clicking "Analyze":**
```
┌──────────────────────────────────────────┐
│ Analyzing The New Yorker...             │
├──────────────────────────────────────────┤
│                                          │
│  ✅ Fetched app metadata                 │
│  ⏳ Downloading reviews (245/365 days)   │
│  ⏳ Discovering competitors...           │
│                                          │
│  [▓▓▓▓▓▓▓░░░] 67%                        │
│                                          │
│  This may take 2-3 minutes...           │
└──────────────────────────────────────────┘
```

**Backend Processing:**
```javascript
POST /api/init
{
  "appId": "123456789",
  "refresh": false,  // Use cache if available
  "includeCompetitors": true  // Phase 1B
}

Steps:
1. Check cache: Do we have data for this app?
   - If yes & !refresh: Return cached data immediately
   - If no or refresh=true: Proceed
   
2. Fetch metadata from iTunes API (cache: 24h)
3. Download reviews from RSS feed
   - Last 365 days
   - Save to reviews.json
   
4. [Phase 1B] Discover competitors
   - Use iTunes search API with category + keywords
   - Return top 10 competitor IDs
   - Save to competitors.json
   
5. [Phase 1B] Download competitor reviews (top 3)
   - Last 365 days for each
   - Save to /data/apps/{competitor_id}/reviews.json
   
6. Return: { 
     "appId": "123", 
     "status": "ready",
     "competitors": [...] 
   }
```

---

### Feature 2: Dashboard Overview

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ ReviewMonster            [Overview] [Issues] [Requests]  │
│                          [Timeline] [Competitors] [Query]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ [Icon] The New Yorker                    │            │
│ │ ⭐⭐⭐⭐☆ 4.2 • 15,847 reviews             │            │
│ │ News & Media • Last analyzed: 2 min ago  │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 🔴 Critical     │ │ ✨ Top Request  │                │
│ │ Login Issues    │ │ Dark Mode       │                │
│ │ 47 reports      │ │ 156 requests    │                │
│ └─────────────────┘ └─────────────────┘                │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 📊 Rating Trend (Last 12 Months)         │            │
│ │                                          │            │
│ │     4.5┼─╮                               │            │
│ │     4.0┼  ╰─╮                            │            │
│ │     3.5┼     ╰───╮                       │            │
│ │        └─────────┼─────────────          │            │
│ │         Jan    Jun    Dec               │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ Quick Insights                                          │
│ • Login problems increased 200% after v2.3.0           │
│ • Users love the article curation                      │
│ • Offline reading is most requested feature           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
GET /api/apps/:appId/overview

Response:
{
  "metadata": {
    "appId": "123",
    "name": "The New Yorker",
    "icon": "https://...",
    "rating": 4.2,
    "reviewCount": 15847,
    "category": "News & Media",
    "analyzedAt": "2026-01-25T10:00:00Z"
  },
  "quickInsights": {
    "topIssue": {
      "title": "Login Issues",
      "severity": "critical",
      "count": 47
    },
    "topRequest": {
      "title": "Dark Mode",
      "count": 156
    },
    "ratingTrend": {
      "direction": "down",
      "change": -0.3,
      "period": "3 months"
    }
  },
  "ratingHistory": [
    { "month": "2025-01", "rating": 4.5 },
    { "month": "2025-02", "rating": 4.4 },
    // ... last 12 months
  ]
}
```

---

### Feature 3: Regression Timeline

**Purpose:** Show when issues appeared/disappeared and their rating impact

**UI Design:**
```
┌──────────────────────────────────────────────────────────┐
│ Regression Timeline                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ View by: [● Version] [ Monthly]                         │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 📉 Rating Impact Over Time               │            │
│ │                                          │            │
│ │ 4.5┼───╮                                 │            │
│ │ 4.0┼    ╰──╮ 🔴 v2.3.0 Login bug        │            │
│ │ 3.5┼       ╰────╮                        │            │
│ │ 3.0┼            ╰──                      │            │
│ │    └────────────┼─────────────           │            │
│ │      v2.2   v2.3   v2.4                 │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ Version History:                                        │
│                                                          │
│ v2.4.0 (Dec 2025)                                       │
│ ├─ ✅ Fixed: Login issues                               │
│ ├─ Rating: 4.1 → 4.3 (+0.2)                            │
│ └─ Impact: 156 positive mentions                       │
│                                                          │
│ v2.3.0 (Oct 2025) 🔴                                    │
│ ├─ ❌ Introduced: Google login bug                      │
│ ├─ ❌ Introduced: iOS 18 crashes                        │
│ ├─ Rating: 4.5 → 4.1 (-0.4)                            │
│ └─ Impact: 89 negative reviews                         │
│                                                          │
│ v2.2.0 (Aug 2025)                                       │
│ ├─ ✅ Stable release                                    │
│ └─ Rating: 4.5 (no change)                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
GET /api/apps/:appId/regression-timeline

// Generate this via LLM analysis
Prompt:
"Analyze reviews by version. For each version:
1. List new issues that appeared
2. List issues that got resolved
3. Calculate rating change
4. Identify key events

Return JSON with timeline data."

Response:
{
  "viewBy": "version",
  "timeline": [
    {
      "version": "2.4.0",
      "releaseDate": "2025-12-01",
      "rating": 4.3,
      "ratingChange": +0.2,
      "introduced": [],
      "resolved": [
        {
          "issueId": "login-google",
          "title": "Google login bug",
          "evidence": ["review-123", "review-456"]
        }
      ],
      "sentiment": "positive",
      "keyEvents": ["Fixed login issues"]
    },
    // ... more versions
  ]
}
```

---

### Feature 4: Issue Deep-Dive

**UI Design:**
```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Issues                                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🔴 Login fails with Google SSO                          │
│ Critical • 47 reports • First seen: Oct 2025            │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 📊 Impact Analysis                       │            │
│ │                                          │            │
│ │ Rating Impact: -0.4 stars                │            │
│ │ Affected Users: ~5-10% (estimated)       │            │
│ │ Trend: Decreasing (fix in v2.4.0)       │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 📅 Timeline                              │            │
│ │                                          │            │
│ │ Oct 2025 (v2.3.0) 🔴                     │            │
│ │ • Issue first reported (3 reviews)       │            │
│ │                                          │            │
│ │ Nov 2025                                 │            │
│ │ • Reports increased to 47                │            │
│ │ • Rating dropped 4.5 → 4.1              │            │
│ │                                          │            │
│ │ Dec 2025 (v2.4.0) ✅                     │            │
│ │ • Fix deployed                           │            │
│ │ • Positive feedback in 12 reviews       │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ 💡 Recommended Actions                                  │
│ • Monitor for regression in future releases             │
│ • Add automated SSO testing                             │
│ • Consider fallback authentication                      │
│                                                          │
│ 📝 Evidence (47 reviews)                                │
│ ┌──────────────────────────────────────────┐            │
│ │ ⭐☆☆☆☆ v2.3.1 • Oct 15, 2025            │            │
│ │ "Cannot login with Google. App is       │            │
│ │  completely unusable now!"              │            │
│ └──────────────────────────────────────────┘            │
│ [Show more reviews...]                                  │
│                                                          │
│ [🎫 Create JIRA Ticket] (Phase 2)                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
GET /api/apps/:appId/issues/:issueId/details

// LLM generates deep analysis
Prompt:
"Analyze this specific issue across all reviews:
1. When did it first appear?
2. When was it resolved (if applicable)?
3. What's the rating impact?
4. What are recommended actions?
5. Group supporting reviews by timeline"

Response:
{
  "issue": {
    "id": "login-google",
    "title": "Login fails with Google SSO",
    "severity": "critical",
    "status": "resolved",
    "reportCount": 47
  },
  "impact": {
    "ratingDrop": -0.4,
    "affectedPercentage": 8,
    "trend": "decreasing"
  },
  "timeline": [
    {
      "date": "2025-10",
      "version": "2.3.0",
      "event": "Issue first reported",
      "reviewCount": 3
    },
    // ... more events
  ],
  "recommendations": [
    "Monitor for regression",
    "Add automated SSO testing",
    "Consider fallback authentication"
  ],
  "supportingReviews": [...]
}
```

---

### Feature 5: Competitive Analysis (Phase 1B)

**UI Design:**
```
┌──────────────────────────────────────────────────────────┐
│ Competitive Analysis                                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Your App vs Top Competitors                             │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 📊 Rating Comparison (Last 12 Months)    │            │
│ │                                          │            │
│ │ 5.0┼                                     │            │
│ │ 4.5┼── You                               │            │
│ │ 4.0┼── Competitor A                      │            │
│ │ 3.5┼── Competitor B                      │            │
│ │    └────────────┼─────────────           │            │
│ │      Jan     Jun     Dec                │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ Feature Comparison                                      │
│ ┌─────────────────┬──────┬──────┬──────┬──────┐        │
│ │ Feature         │ You  │ Comp1│ Comp2│ Comp3│        │
│ ├─────────────────┼──────┼──────┼──────┼──────┤        │
│ │ Offline Reading │  ❌  │  ✅  │  ✅  │  ❌  │        │
│ │ Dark Mode       │  ❌  │  ✅  │  ❌  │  ✅  │ ← Gap! │
│ │ Push Alerts     │  ✅  │  ✅  │  ✅  │  ✅  │        │
│ │ Audio Articles  │  ✅  │  ❌  │  ❌  │  ✅  │ ← Win! │
│ └─────────────────┴──────┴──────┴──────┴──────┘        │
│                                                          │
│ SWOT Analysis                                           │
│ ┌──────────────────────┬──────────────────────┐        │
│ │ Strengths            │ Weaknesses           │        │
│ │ • Quality content    │ • No offline mode    │        │
│ │ • Audio articles     │ • No dark mode       │        │
│ │ • Clean UI           │ • Login issues       │        │
│ ├──────────────────────┼──────────────────────┤        │
│ │ Opportunities        │ Threats              │        │
│ │ • Add dark mode      │ • Comp1 improving    │        │
│ │ • Offline reading    │ • Login stability    │        │
│ │ • Better onboarding  │ • Price competition  │        │
│ └──────────────────────┴──────────────────────┘        │
│                                                          │
│ 💡 Strategic Insights                                   │
│ • Dark mode is table stakes (3/3 competitors have it)   │
│ • Your audio articles are unique differentiator        │
│ • Fix login issues to maintain competitive advantage   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
// Step 1: Discover competitors
POST /api/apps/:appId/competitors/discover
Response: {
  "competitors": [
    { "appId": "111", "name": "Competitor A", "rating": 4.6 },
    { "appId": "222", "name": "Competitor B", "rating": 4.3 },
    // ... up to 10
  ]
}

// Step 2: Analyze top 3 competitors
POST /api/apps/:appId/competitors/analyze
Body: {
  "competitorIds": ["111", "222", "333"],
  "days": 365
}

Steps:
1. Download reviews for each competitor (cache: 24h)
2. Run same analysis as own app (issues, requests, strengths)
3. LLM: Compare features across all apps
4. LLM: Generate SWOT analysis
5. Save to swot.json

// Step 3: Get SWOT report
GET /api/apps/:appId/competitors/swot
Response: {
  "mainApp": {...},
  "competitors": [...],
  "swot": {
    "strengths": [...],
    "weaknesses": [...],
    "opportunities": [...],
    "threats": [...]
  },
  "featureComparison": {
    "features": [
      {
        "name": "Dark Mode",
        "mainApp": false,
        "competitors": [true, false, true],
        "insight": "Gap - consider adding"
      },
      // ...
    ]
  },
  "strategicInsights": [...]
}
```

**LLM Prompt for SWOT:**
```
Analyze reviews from main app and 3 competitors.

Main App: [app name]
Reviews: [sample of 100 reviews]

Competitor 1: [name]
Reviews: [sample of 100 reviews]

... (repeat for all competitors)

Generate SWOT analysis for main app:
- Strengths: What does main app do better? (evidence from reviews)
- Weaknesses: What do competitors do better? (evidence from reviews)
- Opportunities: What features are competitors missing? What do users want?
- Threats: What competitive advantages are competitors building?

Also create feature comparison matrix. Only include features mentioned in reviews.

Return JSON.
```

---

### Feature 6: Recommended Roadmap (Phase 1B)

**UI Design:**
```
┌──────────────────────────────────────────────────────────┐
│ Recommended Roadmap                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🎯 Data-Driven Recommendations                           │
│ Based on your reviews + competitive analysis             │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 🔥 HIGH PRIORITY                         │            │
│ │                                          │            │
│ │ 1. Fix Google Login Issues               │            │
│ │    Impact: Critical • Affects 8% users   │            │
│ │    Evidence: 47 reports, -0.4 rating     │            │
│ │    Competitive: Login stability is basic │            │
│ │    [View Details]                        │            │
│ │                                          │            │
│ │ 2. Add Dark Mode                         │            │
│ │    Impact: High • 156 requests           │            │
│ │    Evidence: Most requested feature      │            │
│ │    Competitive: 3/3 competitors have it  │            │
│ │    [View Details]                        │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 📌 MEDIUM PRIORITY                       │            │
│ │                                          │            │
│ │ 3. Offline Reading Support               │            │
│ │    Impact: Medium • 94 requests          │            │
│ │    Evidence: Users want airplane reading │            │
│ │    Competitive: 2/3 competitors have it  │            │
│ │                                          │            │
│ │ 4. Improve Article Discovery             │            │
│ │    Impact: Medium • 67 mentions          │            │
│ │    Evidence: Users love curation but...  │            │
│ │    Competitive: Your differentiator      │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ 💡 QUICK WINS                            │            │
│ │                                          │            │
│ │ 5. Better Onboarding                     │            │
│ │    Impact: Low • 23 mentions             │            │
│ │    Evidence: New users confused          │            │
│ │    Effort: Low - UI changes only         │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ [Export Roadmap] (Phase 2)                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
GET /api/apps/:appId/roadmap

// LLM generates roadmap
Prompt:
"Based on:
1. Own app issues: [list]
2. Own app feature requests: [list]
3. Competitor strengths: [list]
4. Competitive gaps: [list]

Generate a prioritized roadmap with:
- HIGH priority: Critical bugs + competitive parity features
- MEDIUM priority: High-demand features + competitive differentiators
- QUICK WINS: Easy improvements with good impact

For each item:
- Title
- Priority (high/medium/low)
- Impact (critical/high/medium/low)
- Evidence (review quotes, counts)
- Competitive context
- Recommended action

Only base recommendations on review data. No opinions.

Return JSON."

Response:
{
  "roadmap": [
    {
      "id": "1",
      "title": "Fix Google Login Issues",
      "priority": "high",
      "impact": "critical",
      "category": "bug_fix",
      "evidence": {
        "reportCount": 47,
        "ratingImpact": -0.4,
        "affectedUsers": "8%",
        "sampleReviews": [...]
      },
      "competitiveContext": "Login stability is baseline expectation",
      "recommendation": "Immediate fix required to prevent further rating decline"
    },
    // ... more items
  ],
  "summary": {
    "totalRecommendations": 5,
    "criticalBugs": 1,
    "competitiveGaps": 2,
    "quickWins": 1
  }
}
```

---

### Feature 7: Natural Language Query (Enhanced)

**Now includes competitive context**

**UI Design:**
```
┌──────────────────────────────────────────────────────────┐
│ Query Console                                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Ask anything about your app or competitors              │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ What features do my competitors have     │            │
│ │ that I don't?                      [Ask] │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
│ 💬 Answer:                                               │
│                                                          │
│ Based on review analysis, your top 3 competitors have:  │
│                                                          │
│ 1. **Dark Mode** (Competitors A, B have it)            │
│    - 156 of your users requested this                   │
│    - Competitor A: "Love the dark mode for night..."   │
│                                                          │
│ 2. **Offline Reading** (Competitors A, C have it)      │
│    - 94 of your users want this                         │
│    - Competitor C: "Perfect for airplane reading..."   │
│                                                          │
│ 3. **Better Search** (Competitor B has it)             │
│    - 45 of your users mentioned search issues           │
│                                                          │
│ Sources: Your reviews (156, 94, 45 requests),           │
│ Competitor reviews (analyzed from 1000+ reviews)        │
│                                                          │
│ ┌──────────────────────────────────────────┐            │
│ │ Previous Queries:                        │            │
│ │ • What's causing the recent rating drop? │            │
│ │ • How do users feel about the UI?        │            │
│ └──────────────────────────────────────────┘            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
POST /api/apps/:appId/query
Body: {
  "query": "What features do my competitors have that I don't?",
  "includeCompetitors": true
}

Steps:
1. Load context:
   - Own app insights.json
   - Own app reviews (sample 100)
   - Competitor insights (if Phase 1B complete)
   - SWOT analysis
   
2. Send to LLM:
   System: "You are a product intelligence analyst. Answer based 
            ONLY on review data. Include specific evidence."
   User: [query]
   Context: [all loaded data]
   
3. Parse response
4. Format with citations

Response:
{
  "query": "What features do my competitors have that I don't?",
  "answer": "Based on review analysis...",
  "sources": [
    {
      "type": "own_request",
      "feature": "Dark Mode",
      "count": 156,
      "evidence": ["review-123", ...]
    },
    {
      "type": "competitor_feature",
      "competitor": "Competitor A",
      "feature": "Dark Mode",
      "evidence": ["comp-review-456", ...]
    }
  ],
  "confidence": "high"
}
```

---

## 🗂️ Data Structure (JSON Files)

### Own App Data

**`/data/apps/123456789/metadata.json`**
```json
{
  "appId": "123456789",
  "name": "The New Yorker",
  "developer": "Condé Nast",
  "iconUrl": "https://...",
  "rating": 4.2,
  "reviewCount": 15847,
  "category": "News & Media",
  "price": "Free",
  "screenshots": ["url1", "url2", ...],
  "description": "...",
  "analyzedAt": "2026-01-25T10:00:00Z",
  "cacheExpiry": "2026-01-26T10:00:00Z"
}
```

**`/data/apps/123456789/reviews.json`**
```json
[
  {
    "id": "review-1",
    "rating": 1,
    "title": "Can't login!",
    "body": "Google login broken...",
    "version": "2.3.1",
    "date": "2025-10-15T14:30:00Z",
    "author": "angry_user_123",
    "helpful": 45
  },
  // ... up to 1 year of reviews
]
```

**`/data/apps/123456789/insights.json`**
```json
{
  "issues": [
    {
      "id": "login-google",
      "title": "Login fails with Google SSO",
      "severity": "critical",
      "count": 47,
      "reviewIds": ["review-1", "review-5", ...],
      "description": "Users unable to authenticate...",
      "firstSeen": "2025-10-01",
      "status": "resolved",
      "resolvedIn": "v2.4.0"
    }
  ],
  "requests": [
    {
      "id": "dark-mode",
      "title": "Dark Mode",
      "count": 156,
      "reviewIds": [...],
      "priority": "high",
      "competitorHas": ["comp-111", "comp-222"]
    }
  ],
  "strengths": [
    {
      "title": "Quality Content",
      "count": 234,
      "reviewIds": [...],
      "sentiment": "positive"
    }
  ],
  "generatedAt": "2026-01-25T10:05:00Z",
  "cachedUntil": "2026-01-26T10:05:00Z"
}
```

**`/data/apps/123456789/regression.json`** ✨ NEW
```json
{
  "viewBy": "version",
  "timeline": [
    {
      "version": "2.4.0",
      "releaseDate": "2025-12-01",
      "rating": 4.3,
      "ratingChange": 0.2,
      "reviewCount": 347,
      "introduced": [],
      "resolved": [
        {
          "issueId": "login-google",
          "evidence": ["review-123", ...]
        }
      ],
      "keyEvents": ["Fixed login issues", "Improved stability"]
    }
  ],
  "monthlyView": [...],
  "generatedAt": "2026-01-25T10:10:00Z"
}
```

### Competitor Data (Phase 1B)

**`/data/apps/123456789/competitors.json`** ✨ NEW
```json
{
  "discovered": [
    {
      "appId": "111",
      "name": "Competitor A",
      "rating": 4.6,
      "reviewCount": 23456,
      "relevanceScore": 0.95
    },
    // ... up to 10 competitors
  ],
  "analyzed": ["111", "222", "333"],
  "discoveredAt": "2026-01-25T10:15:00Z"
}
```

**`/data/apps/111/insights.json`**
```json
// Same structure as own app
{
  "issues": [...],
  "requests": [...],
  "strengths": [...]
}
```

**`/data/apps/123456789/swot.json`** ✨ NEW
```json
{
  "mainApp": "123456789",
  "competitors": ["111", "222", "333"],
  "swot": {
    "strengths": [
      {
        "title": "Quality Content",
        "evidence": ["review-x", ...],
        "competitiveContext": "Better than Competitor B"
      }
    ],
    "weaknesses": [
      {
        "title": "No Dark Mode",
        "evidence": ["review-y", ...],
        "competitorsWith": ["111", "333"]
      }
    ],
    "opportunities": [
      {
        "title": "Add Offline Reading",
        "demand": 94,
        "competitorGap": "Competitor 2 doesn't have it"
      }
    ],
    "threats": [
      {
        "title": "Competitor A improving faster",
        "evidence": ["Recent updates", "Rating trend"]
      }
    ]
  },
  "featureMatrix": [
    {
      "feature": "Dark Mode",
      "mainApp": false,
      "comp111": true,
      "comp222": false,
      "comp333": true,
      "insight": "Competitive gap"
    }
  ],
  "generatedAt": "2026-01-25T10:20:00Z"
}
```

**`/data/apps/123456789/roadmap.json`** ✨ NEW
```json
{
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Fix Google Login",
      "priority": "high",
      "impact": "critical",
      "category": "bug_fix",
      "evidence": {
        "reportCount": 47,
        "ratingImpact": -0.4,
        "sampleReviews": [...]
      },
      "competitiveContext": "Basic table stakes",
      "recommendedAction": "Immediate fix required"
    }
  ],
  "generatedAt": "2026-01-25T10:25:00Z"
}
```

---

## 🏗️ Technical Architecture

### Backend Structure

```
/reviewmonster-api
├── /config
│   └── llm.config.js          # LLM abstraction config
├── /routes
│   ├── init.routes.js         # POST /api/init
│   ├── overview.routes.js     # GET /api/apps/:id/overview
│   ├── issues.routes.js       # GET /api/apps/:id/issues
│   ├── regression.routes.js   # GET /api/apps/:id/regression-timeline
│   ├── competitors.routes.js  # Competitor analysis endpoints
│   └── query.routes.js        # POST /api/apps/:id/query
├── /services
│   ├── appstore.service.js    # Fetch metadata, reviews from iTunes/RSS
│   ├── llm.service.js         # LLM abstraction layer ⭐
│   ├── cache.service.js       # Caching for HTTP & LLM ⭐
│   ├── analysis.service.js    # Generate insights, regression, SWOT
│   └── competitor.service.js  # Discover & analyze competitors
├── /utils
│   ├── parser.js              # Parse App Store data
│   └── storage.js             # JSON file operations
├── /data                      # Local file storage
│   └── /apps
│       └── /{app_id}
│           ├── metadata.json
│           ├── reviews.json
│           ├── insights.json
│           ├── regression.json
│           ├── competitors.json
│           ├── swot.json
│           └── roadmap.json
└── server.js
```

### LLM Abstraction Layer ⭐

**`/config/llm.config.js`**
```javascript
module.exports = {
  provider: 'openai', // Can switch to 'anthropic', 'gemini', etc.
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 2000,
  caching: {
    enabled: true,
    ttl: 86400 // 24 hours
  }
};
```

**`/services/llm.service.js`**
```javascript
class LLMService {
  constructor() {
    this.config = require('../config/llm.config');
    this.client = this.initClient();
    this.cache = require('./cache.service');
  }

  async generateResponse(prompt, options = {}) {
    // Check cache first
    const cacheKey = this.getCacheKey(prompt);
    if (this.config.caching.enabled && !options.refresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    // Call LLM
    let response;
    switch (this.config.provider) {
      case 'openai':
        response = await this.callOpenAI(prompt, options);
        break;
      case 'anthropic':
        response = await this.callAnthropic(prompt, options);
        break;
      // Add more providers as needed
      default:
        throw new Error('Unsupported LLM provider');
    }

    // Cache response
    if (this.config.caching.enabled) {
      await this.cache.set(cacheKey, response, this.config.caching.ttl);
    }

    return response;
  }

  async callOpenAI(prompt, options) {
    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || this.config.temperature,
      max_tokens: options.maxTokens || this.config.maxTokens,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined
    });

    return completion.choices[0].message.content;
  }

  getCacheKey(prompt) {
    // Generate hash of prompt + config for cache key
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ prompt, config: this.config }))
      .digest('hex');
    return `llm:${hash}`;
  }
}

module.exports = new LLMService();
```

### Caching Service ⭐

**`/services/cache.service.js`**
```javascript
const fs = require('fs').promises;
const path = require('path');

class CacheService {
  constructor() {
    this.cacheDir = path.join(__dirname, '../data/cache');
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  async get(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const cached = JSON.parse(data);

      // Check expiry
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        await this.delete(key);
        return null;
      }

      return cached.value;
    } catch (error) {
      return null;
    }
  }

  async set(key, value, ttl = 86400) {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    const cached = {
      value,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (ttl * 1000)
    };
    await fs.writeFile(filePath, JSON.stringify(cached, null, 2));
  }

  async delete(key) {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  async clear() {
    const files = await fs.readdir(this.cacheDir);
    await Promise.all(files.map(file => 
      fs.unlink(path.join(this.cacheDir, file))
    ));
  }
}

module.exports = new CacheService();
```

### HTTP Caching ⭐

All App Store API calls (iTunes API, RSS feeds) will be cached with 24-hour TTL:

```javascript
// In appstore.service.js
async fetchMetadata(appId, refresh = false) {
  const cacheKey = `metadata:${appId}`;
  
  if (!refresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(`https://itunes.apple.com/lookup?id=${appId}`);
  const data = await response.json();
  
  await cache.set(cacheKey, data, 86400); // 24 hour TTL
  return data;
}
```

---

## 📅 Implementation Timeline

### Phase 1A: Core Intelligence (Weeks 1-4)

**Week 1: Foundation**
- [ ] Set up GitHub repos
- [ ] Init Node.js + Express backend
- [ ] Init React + Vite frontend
- [ ] Implement LLM abstraction layer
- [ ] Implement caching service
- [ ] Test Apple RSS feed scraping

**Week 2: Data Collection & Analysis**
- [ ] Build App Store scraper (1 year of reviews)
- [ ] Implement basic insights generation (issues, requests, strengths)
- [ ] Implement regression timeline analysis
- [ ] Test with The New Yorker app

**Week 3: Frontend - Dashboard**
- [ ] Build onboarding page
- [ ] Build dashboard overview
- [ ] Build issues tab with deep-dive
- [ ] Build regression timeline tab
- [ ] Add loading states

**Week 4: Query & Polish**
- [ ] Implement natural language query
- [ ] Add error handling
- [ ] Basic styling with Tailwind
- [ ] End-to-end testing
- [ ] Deploy to Vercel + Render

**Validation Checkpoint:**
- Can analyze The New Yorker app end-to-end
- Insights are accurate and useful
- Ready to show to 5 PMs for feedback

---

### Phase 1B: Competitive Intelligence (Weeks 5-8)

**Week 5: Competitor Discovery**
- [ ] Build competitor discovery API
- [ ] Implement competitor review scraping
- [ ] Test with The New Yorker's competitors

**Week 6: Competitive Analysis**
- [ ] Implement SWOT generation
- [ ] Implement feature comparison matrix
- [ ] Build competitors tab UI
- [ ] Test analysis quality

**Week 7: Roadmap & Integration**
- [ ] Implement roadmap generation
- [ ] Build roadmap tab UI
- [ ] Enhance query with competitive context
- [ ] Update all tabs with competitive data

**Week 8: Testing & Launch**
- [ ] End-to-end testing
- [ ] Fix bugs
- [ ] Prepare launch materials
- [ ] Deploy and launch

**Validation Checkpoint:**
- 10-20 PMs have used the tool
- Feedback is positive on competitive features
- Decide: Continue to Phase 2?

---

## 🚦 Validation Gates

### After Phase 1A (Week 4)
**Question:** Are core insights valuable?

**Go if:**
- ✅ Can analyze any app in < 5 minutes
- ✅ Issues/requests are accurate
- ✅ 5 PMs say "this is useful"

**No-go if:**
- ❌ Too slow (> 10 minutes)
- ❌ Insights are gibberish
- ❌ No one finds it useful

**Decision:** Fix critical issues OR proceed to Phase 1B

---

### After Phase 1B (Week 8)
**Question:** Is competitive analysis valuable? Should we go full-time?

**Go if:**
- ✅ 20+ PMs analyzed their app
- ✅ 5+ came back multiple times
- ✅ People say "I'd pay for this"
- ✅ Competitive features add clear value

**No-go if:**
- ❌ < 10 total users
- ❌ No one uses competitive features
- ❌ Feedback is "meh"

**Decision:** Proceed to Phase 2 (multi-tenancy) OR pivot

---

## 🎯 Phase 2: Multi-Tenancy & Scaling (Weeks 9+)

**Only build if Phase 1B validates the idea.**

### What Changes
1. **Authentication:** Email/password signup
2. **Database:** Migrate from JSON to MongoDB Atlas
3. **Multi-app support:** Users can track multiple apps
4. **Payment:** Stripe integration
5. **JIRA Integration:** Create tickets from issues
6. **Android Support:** Google Play Store reviews
7. **Alerts:** Email/Slack notifications

### New Tech Stack
- **Database:** MongoDB Atlas or Supabase
- **Auth:** NextAuth.js or Supabase Auth
- **Payments:** Stripe
- **Integrations:** JIRA REST API, Slack webhooks

### Estimated Timeline
- +4 weeks for auth + database migration
- +2 weeks for JIRA integration
- +3 weeks for Android support
- +2 weeks for alerts

**Total: ~11 weeks**

---

## 💰 Cost Breakdown

### Phase 1A (Weeks 1-4)
| Item | Cost |
|------|------|
| Hosting (Vercel + Render) | $0 |
| OpenAI API | ~$20-30/month |
| Domain | $12/year |
| **Monthly Total** | **~$20-30** |

### Phase 1B (Weeks 5-8)
| Item | Cost |
|------|------|
| Hosting | $0 |
| OpenAI API (more calls) | ~$40-60/month |
| Domain | Included |
| **Monthly Total** | **~$40-60** |

With aggressive caching, should stay under $50/month.

### Phase 2 (If validated)
| Item | Cost |
|------|------|
| Hosting (upgrade) | $15-20/month |
| MongoDB Atlas | $0 (free tier) |
| OpenAI API | $100-200/month (more users) |
| Stripe fees | 2.9% + $0.30 per transaction |
| **Monthly Total** | **~$115-220 + Stripe fees** |

---

## 🛡️ What We're NOT Building (Phase 1)

**Explicitly out of scope:**

❌ User accounts (hardcoded to one app in Phase 1A)
❌ Database (JSON files work fine)
❌ Payment processing
❌ Team collaboration
❌ Mobile apps
❌ Export to PDF (Phase 2)
❌ Email alerts (Phase 2)
❌ JIRA integration (Phase 2)
❌ Android support (Phase 2)
❌ API rate limiting
❌ Admin dashboard

**Why:** Focus on proving the intelligence engine works first.

---

## 📊 Success Metrics

### Phase 1A (Weeks 1-4)
- [ ] Can analyze any app in < 5 minutes
- [ ] Insights are 80%+ accurate (manual validation)
- [ ] Regression timeline shows clear patterns
- [ ] 5 PMs give positive feedback

### Phase 1B (Weeks 5-8)
- [ ] Can discover competitors automatically
- [ ] SWOT analysis is actionable
- [ ] 10-20 active users
- [ ] 5+ users return multiple times
- [ ] Net Promoter Score > 7

**If we hit these metrics → Proceed to Phase 2**

---

## 🧪 Testing Strategy

### Automated Testing (Minimal for MVP)
- API endpoint tests (Jest)
- Data scraping validation
- LLM response format validation

### Manual Testing
- Test with 10 different apps
- Validate insights accuracy
- Compare with actual App Store
- Get PM feedback

### Beta Testing (Week 8)
- 10-15 PMs use the tool
- Watch them use it (screen share)
- Collect feedback
- Fix top 3 issues

---

## 📝 API Documentation

### Core Endpoints (Phase 1A)

```bash
# Initialize analysis
POST /api/init
Body: { "appId": "123456789", "refresh": false }
Response: { "status": "analyzing", "progress": {...} }

# Get overview
GET /api/apps/:appId/overview
Response: { "metadata": {...}, "quickInsights": {...}, "ratingHistory": [...] }

# Get issues
GET /api/apps/:appId/issues
Response: { "issues": [...] }

# Get issue details
GET /api/apps/:appId/issues/:issueId
Response: { "issue": {...}, "impact": {...}, "timeline": [...] }

# Get regression timeline
GET /api/apps/:appId/regression-timeline
Query: ?view=version|monthly
Response: { "timeline": [...] }

# Natural language query
POST /api/apps/:appId/query
Body: { "query": "What's broken?" }
Response: { "answer": "...", "sources": [...] }
```

### Competitive Endpoints (Phase 1B)

```bash
# Discover competitors
POST /api/apps/:appId/competitors/discover
Response: { "competitors": [...] }

# Analyze competitors
POST /api/apps/:appId/competitors/analyze
Body: { "competitorIds": ["111", "222", "333"], "days": 365 }
Response: { "status": "analyzing" }

# Get SWOT
GET /api/apps/:appId/competitors/swot
Response: { "swot": {...}, "featureComparison": [...] }

# Get roadmap
GET /api/apps/:appId/roadmap
Response: { "recommendations": [...] }
```

All endpoints support `?refresh=true` to bypass cache.

---

## 🎨 UI Design Philosophy

**Principle:** Information density + clarity

**Visual Hierarchy:**
1. Critical issues → Red
2. Opportunities → Green
3. Info → Blue
4. Neutral → Gray

**Components:**
- Cards for grouped information
- Charts for trends (Chart.js)
- Tables for comparisons
- Modals for deep-dives
- Loading skeletons (not spinners)

**Inspiration:**
- Linear - Clean, fast, minimal
- Amplitude - Data visualization
- Datadog - Dashboard layout

---

## 🚀 Launch Plan

### Pre-Launch (Week 4 & Week 8)
- [ ] Test with 5 different apps
- [ ] Validate insights accuracy
- [ ] Create demo video (3 min)
- [ ] Write simple landing page copy

### Launch (Week 8)
- [ ] Post on Product Hunt
- [ ] Share on Twitter/LinkedIn
- [ ] Post in r/productmanagement
- [ ] Direct outreach to 20 PMs

### Post-Launch (Weeks 9-12)
- [ ] Respond to every user within 24h
- [ ] Fix bugs daily
- [ ] Weekly feedback calls with active users
- [ ] Track metrics in Google Sheets

---

## 📚 Open Questions

### App Store APIs
1. What other metadata can we get from iTunes API?
   - Screenshots? Release notes? Developer info?
2. Can we get version history programmatically?
3. Rate limits on RSS feed?

### Insights
1. Can we detect feature launches from reviews?
2. Can we predict rating trends?
3. Can we identify user segments (power users vs casual)?

### Competitor Discovery
1. How to automatically find competitors?
   - iTunes search by category + keywords?
   - Manual curated list for Phase 1?
2. How to rank competitor relevance?

### Feature Extraction
1. How to list all app features?
   - Parse App Store description?
   - Analyze screenshots with vision AI?
   - Prompt users to list features?
   - Extract from reviews?

**Decision:** Start simple, iterate based on feedback

---

## ⚠️ Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM costs spiral | Medium | High | Aggressive caching, set budget alerts |
| Apple changes RSS | Low | High | Monitor, backup plan (manual input) |
| Competitor discovery fails | Medium | Medium | Start with manual list, add auto later |
| Feature comparison inaccurate | Medium | Medium | Validate with human review |
| Scope creep | High | High | Strict phase gates, kill features ruthlessly |
| No one uses it | High | High | Launch early, get feedback fast |

---

## ✅ Definition of Done

### Phase 1A Done When:
- [x] User enters App Store ID
- [x] System scrapes 1 year of reviews in < 5 min
- [x] Dashboard shows insights, timeline, issues
- [x] Query console works
- [x] Deployed to production
- [x] 5 PMs have tested and given feedback

### Phase 1B Done When:
- [x] All Phase 1A criteria met
- [x] Competitor discovery works
- [x] SWOT analysis is actionable
- [x] Roadmap recommendations make sense
- [x] 10-20 users have tried it
- [x] 5+ users came back multiple times
- [x] Ready to decide on Phase 2

---

## 📞 Next Steps

### This Week (Week 1)
1. ✅ Create GitHub repos
2. ✅ Set up project structure
3. ✅ Implement LLM abstraction layer
4. ✅ Implement caching service
5. ✅ Test RSS feed scraping with The New Yorker

### Next Week (Week 2)
1. Build complete scraper (1 year of reviews)
2. Implement insights generation
3. Implement regression analysis
4. Validate with The New Yorker

### This Month (Weeks 1-4)
1. Complete Phase 1A
2. Get feedback from 5 PMs
3. Decide: Continue to Phase 1B?

---

## 🎯 The 8-Week Challenge

**Weeks 1-4:** Core intelligence engine ✅  
**Validation Gate:** Is it useful?  
**Weeks 5-8:** Competitive intelligence ✅  
**Validation Gate:** Should we go full-time?  

**Your job:** Execute one phase at a time. Get feedback. Decide fast.

---

## 💡 Remember

1. **Ship Phase 1A in 4 weeks** - Don't wait for perfection
2. **Validate before expanding** - Only add competitors if core works
3. **Cache aggressively** - Keep costs low
4. **Build for migration** - JSON → MongoDB should be easy
5. **Get feedback early** - 5 PMs after Week 4

**This is a validation project. Build → Learn → Decide.**

**If it works → go full-time.** ✅  
**If it doesn't → learned a ton, move on.** ✅  

**Either way, you win. 🚀**

---

*End of PRD v2.0*

---

## Appendix A: Comparison with Original Lean PRD

### What Changed?
1. **Added:** Competitor discovery and analysis (Phase 1B)
2. **Added:** SWOT analysis and feature comparison
3. **Added:** Regression timeline (issue tracking over versions)
4. **Added:** Strategic roadmap generation
5. **Added:** LLM abstraction layer
6. **Added:** Aggressive caching (LLM + HTTP)
7. **Extended:** Timeline from 6 weeks → 8 weeks (2 phases)

### What Stayed the Same?
1. **Core philosophy:** Validate before scaling
2. **No auth in Phase 1**
3. **JSON file storage** (migrate later)
4. **Lean tech stack**
5. **Clear validation gates**
6. **Bootstrap approach** (~$50/month)

### Why the Changes?
- Requirements doc showed more ambitious vision
- Competitive intelligence is key differentiator
- Phased approach maintains lean validation
- Caching keeps costs manageable
- LLM abstraction future-proofs the architecture

---

## Appendix B: Migration Path (Phase 1 → Phase 2)

### JSON to MongoDB
```javascript
// Current (Phase 1)
const insights = require('./data/apps/123/insights.json');

// Future (Phase 2)
const insights = await db.collection('insights').findOne({ appId: '123' });
```

**Migration script:**
```javascript
// migrate.js
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function migrate() {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db('reviewmonster');
  
  // Read all JSON files
  const apps = fs.readdirSync('./data/apps');
  
  for (const appId of apps) {
    const metadata = JSON.parse(fs.readFileSync(`./data/apps/${appId}/metadata.json`));
    const reviews = JSON.parse(fs.readFileSync(`./data/apps/${appId}/reviews.json`));
    const insights = JSON.parse(fs.readFileSync(`./data/apps/${appId}/insights.json`));
    
    // Insert into MongoDB
    await db.collection('apps').insertOne({ appId, ...metadata });
    await db.collection('reviews').insertMany(reviews.map(r => ({ appId, ...r })));
    await db.collection('insights').insertOne({ appId, ...insights });
  }
  
  client.close();
}
```

**Estimated migration time:** 2-3 hours for 100 apps

---

