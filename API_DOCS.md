# ReviewMonster API Documentation

## Base URL
```
http://localhost:3000
```

---

## 🚀 Onboarding Flow

### 1. Fetch App Metadata
**Endpoint:** `POST /apps/metadata`

Fetches app metadata from the App Store given an App Store ID.

**Request Body:**
```json
{
  "appId": "1081530898",
  "country": "us"
}
```

**Response:**
```json
{
  "appId": 1081530898,
  "name": "App Name",
  "seller": "Seller Name",
  "icon": "https://...",
  "rating": 4.5,
  "ratingCount": 12345,
  "genre": "Productivity",
  "description": "App description...",
  "version": "1.2.3",
  "releaseDate": "2024-01-15T00:00:00Z"
}
```

### 2. Initialize App Analysis
**Endpoint:** `POST /init`

Downloads reviews and runs initial analysis. This must be run before accessing other endpoints.

**Request Body:**
```json
{
  "refresh": false
}
```

**Response:**
```json
{
  "message": "Init complete",
  "reviewsDownloaded": 1234,
  "analyzedCount": 1234
}
```

---

## 📊 Core Screens

### 3. Overview / Dashboard
**Endpoint:** `GET /overview`

Returns executive summary with critical alerts, metrics, what's working, and top issues/requests.

**Response:**
```json
{
  "metrics": {
    "totalReviews": 1234,
    "avgRating": 4.2,
    "sentiment": {
      "positive": 456,
      "neutral": 234,
      "negative": 544
    }
  },
  "alerts": [
    {
      "severity": "high",
      "message": "123 low ratings (1-2★) detected",
      "type": "rating_drop"
    }
  ],
  "topIssues": [
    { "text": "login_bug", "count": 45 },
    { "text": "app_crashes", "count": 32 }
  ],
  "topRequests": [
    { "text": "dark_mode", "count": 67 },
    { "text": "offline_mode", "count": 43 }
  ],
  "whatsWorking": [
    { "text": "ui_design", "count": 89 },
    { "text": "fast_performance", "count": 67 }
  ],
  "summary": "PRODUCT FEEDBACK MEMO\n\nKEY METRICS..."
}
```

### 4. Your Product (Deep Dive)
**Endpoint:** `GET /your-product`

Returns detailed analysis of your app including issues with severity, feature requests with demand, and strengths with evidence.

**Response:**
```json
{
  "sentiment": {
    "positive": 456,
    "neutral": 234,
    "negative": 544
  },
  "issues": [
    {
      "text": "login_bug",
      "count": 45,
      "avgRating": 1.8,
      "severity": "critical",
      "evidence": [
        {
          "text": "Cannot login after update...",
          "rating": 1,
          "date": "2024-01-15",
          "version": "1.2.3"
        }
      ]
    }
  ],
  "featureRequests": [
    {
      "text": "dark_mode",
      "count": 67,
      "demand": "high",
      "evidence": [...]
    }
  ],
  "strengths": [
    {
      "text": "ui_design",
      "count": 89,
      "evidence": [...]
    }
  ],
  "totalReviews": 1234
}
```

### 5. Release Timeline
**Endpoint:** `GET /release-timeline`

Returns sentiment impact, new issues, and resolved issues per version.

**Response:**
```json
{
  "versions": [
    {
      "version": "1.2.3",
      "releaseDate": "2024-01-15",
      "sentimentBefore": 4.2,
      "sentimentAfter": 3.8,
      "newIssues": ["login_bug", "crash_on_startup"],
      "resolvedIssues": ["slow_loading"],
      "reviewCount": 234
    }
  ]
}
```

---

## 🏆 Competitors

### 6. Discover Competitors
**Endpoint:** `POST /competitors/init`

Discovers top competitors for your app based on genre, reviews, and similarity.

**Request Body:**
```json
{
  "ourAppId": "1081530898",
  "country": "us"
}
```

**Response:**
```json
{
  "competitors": [
    {
      "appId": "123456789",
      "name": "Competitor App",
      "seller": "Competitor Inc",
      "genre": "Productivity",
      "score": 0.85,
      "rating": 4.3
    }
  ]
}
```

### 7. Fetch Competitor Data
**Endpoint:** `POST /competitors/run`

Downloads and analyzes reviews for your app and selected competitors.

**Request Body:**
```json
{
  "mainApp": {
    "appId": "1081530898",
    "name": "Your App"
  },
  "competitorIds": ["123456789", "987654321"],
  "days": 90
}
```

**Response:**
```json
{
  "generatedAt": "2024-01-20T12:00:00Z",
  "windowDays": 90,
  "mainApp": {
    "appId": "1081530898",
    "name": "Your App",
    "reviews": [...],
    "analyzed": [...]
  },
  "competitors": {
    "123456789": {
      "appId": "123456789",
      "name": "Competitor App",
      "reviews": [...],
      "analyzed": [...]
    }
  }
}
```

### 8. SWOT Comparison
**Endpoint:** `POST /competitors/compare`

Generates SWOT analysis comparing your app with competitors.

**Request Body:**
```json
{
  "mainApp": {
    "appId": "1081530898"
  },
  "competitorIds": ["123456789"],
  "days": 90
}
```

**Response:**
```json
{
  "Competitor App": {
    "strengths": [
      { "text": "fast_performance", "count": 45 }
    ],
    "weaknesses": [
      { "text": "poor_support", "count": 23 }
    ],
    "opportunities": [
      { "text": "tablet_support", "count": 12 }
    ],
    "threats": [
      { "text": "ui_design", "count": 89 }
    ]
  }
}
```

---

## 🔍 Evidence & Insights

### 9. Get Evidence for Issue/Weakness
**Endpoint:** `GET /evidence/:type/:item`

Returns actual user reviews as evidence for any issue, weakness, strength, or request.

**URL Parameters:**
- `type`: `issue`, `weakness`, `strength`, `request`, `praise`, or `opportunity`
- `item`: URL-encoded issue/item name (e.g., `login_bug`)

**Query Parameters:**
- `competitorId` (optional): If provided, shows evidence from competitor reviews

**Examples:**
```
GET /evidence/issue/login_bug
GET /evidence/weakness/poor_support?competitorId=123456789
GET /evidence/strength/ui_design
GET /evidence/request/dark_mode
```

**Response:**
```json
{
  "type": "issue",
  "item": "login_bug",
  "count": 45,
  "evidence": [
    {
      "text": "Cannot login after update. Keep getting error message...",
      "title": "Login broken",
      "rating": 1,
      "date": "2024-01-15T12:00:00Z",
      "version": "1.2.3",
      "user": "AppUser123"
    }
  ]
}
```

---

## 💬 Query Console

### 10. Natural Language Query
**Endpoint:** `POST /query`

Ask natural language questions about your product reviews and get AI-powered insights.

**Request Body:**
```json
{
  "query": "What are users saying about login issues?"
}
```

**Response:**
```json
{
  "query": "What are users saying about login issues?",
  "answer": "Users are reporting significant login problems, particularly after the 1.2.3 update. The most common complaints include...",
  "context": {
    "reviewsAnalyzed": 1234,
    "avgRating": 4.2
  }
}
```

**Example Queries:**
- "What are the top 3 complaints this month?"
- "Why did our rating drop?"
- "What features are users requesting most?"
- "How does our UI compare to competitors?"
- "What are users saying about the latest version?"

---

## 📈 Analytics

### 11. Regression Tree
**Endpoint:** `GET /regression-tree`

Returns regression analysis showing which issues correlate with rating changes.

### 12. Impact Model
**Endpoint:** `GET /impact-model`

Returns predictive model showing estimated impact of fixing specific issues.

### 13. Yearly Report
**Endpoint:** `GET /yearly-report`

Returns comprehensive annual report with trends, patterns, and insights.

---

## 🔄 Workflow

### Typical Usage Flow:

1. **Onboarding:**
   ```
   POST /apps/metadata (appId)
   → Get app details
   → User confirms
   POST /init (refresh: true)
   → Downloads & analyzes reviews
   ```

2. **Dashboard View:**
   ```
   GET /overview
   → Shows executive summary
   ```

3. **Deep Dive:**
   ```
   GET /your-product
   → Shows issues, requests, strengths

   GET /evidence/issue/login_bug
   → Click any issue to see actual reviews
   ```

4. **Competitive Analysis:**
   ```
   POST /competitors/init
   → Discover competitors

   POST /competitors/run
   → Fetch competitor data

   POST /competitors/compare
   → Generate SWOT

   GET /evidence/weakness/poor_support?competitorId=123456789
   → See competitor weaknesses
   ```

5. **Query Console:**
   ```
   POST /query
   → Ask questions in natural language
   ```

---

## 🔧 Configuration

All endpoints require the following environment variables:

```env
OPENAI_API_KEY=sk-...
```

---

## 📝 Notes

- **App ID Configuration:** The hardcoded App ID (`1081530898`) in `fetchReviews.js` and `appStoreScraper.js` should be replaced with dynamic configuration for multi-app support (V1.1).

- **Caching:** Review analysis is cached to avoid redundant API calls. Use `refresh: true` in `/init` to force re-analysis.

- **Rate Limits:** Apple's RSS feeds may rate-limit excessive requests. Implement exponential backoff if needed.

- **Data Persistence:** Currently uses JSON files in `/data` directory. Consider database migration for production.

---

## 🚀 Future Enhancements (from PRD)

### V1.1 (High Priority)
- Multi-app workspace switcher
- Competitor management (add/remove)
- Time period comparison
- Export & sharing (PDF, CSV)
- Smart alerts configuration

### V1.2 (Medium Priority)
- Advanced filters (version, rating, date)
- Release planning assistant
- Competitive trends timeline
- Review search & tagging
- Customizable dashboard

### V2.0 (Future)
- Predictive intelligence
- User cohort analysis
- Automated response suggestions
- Cross-platform (Google Play)
- Team collaboration features
- Integration ecosystem (Jira, Linear, etc.)

---

## 📚 Key Differentiators

**What ReviewMonster offers that others don't:**

| Feature | Status |
|---------|--------|
| Decision memo | ✅ YES |
| Rating-driver analysis | ✅ YES |
| Executive summary | ✅ YES |
| Product recommendations | ✅ YES |
| Evidence-based insights | ✅ YES |
| SWOT comparison | ✅ YES |
| Natural language queries | ✅ YES |
| Persistent product memory | 🔜 Coming |
| Queryable product brain | 🔜 Coming |

**Positioning:** *"We don't show you review data. We tell you what to do about it."*

This is **Product Intelligence**, not just review analytics.
