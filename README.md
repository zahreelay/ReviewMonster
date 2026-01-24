# ReviewMonster 🦖

> **Product Intelligence, not just review analytics.**
> *"We don't show you review data. We tell you what to do about it."*

ReviewMonster is a comprehensive product intelligence platform that transforms App Store reviews into actionable insights. Unlike traditional review analytics tools, ReviewMonster provides decision memos, rating-driver analysis, and evidence-based recommendations to guide your product strategy.

---

## 🎯 What Makes ReviewMonster Different

| Traditional Tools | ReviewMonster |
|------------------|---------------|
| Show review data | **Tells you what to do** |
| Generic dashboards | **Decision memos** |
| Sentiment charts | **Rating-driver analysis** |
| Keyword tagging | **Executive summaries** |
| Review ingestion | **Product recommendations** |
| - | **Evidence-based insights** |
| - | **SWOT competitive analysis** |
| - | **Natural language queries** |

---

## ✨ Key Features

### 📱 Onboarding Flow
- Enter App Store ID to fetch app metadata
- Automatic review download and AI-powered analysis
- One-time app setup (locked after confirmation)

### 📊 Core Screens

#### **Overview Dashboard**
- Executive summary with critical alerts
- Key metrics (avg rating, total reviews, sentiment distribution)
- Top issues, feature requests, and what's working
- AI-generated product feedback memo

#### **Your Product (Deep Dive)**
- **Issues** with severity levels (critical/high/medium/low)
- **Feature Requests** with demand indicators
- **Strengths** with evidence from real reviews
- Click any item to see actual user reviews

#### **Release Timeline**
- Sentiment impact per version
- New issues introduced in each release
- Resolved issues from previous versions
- Version-by-version review counts

#### **Competitors**
- Discover top competitors automatically
- Browse competitor metadata (ratings, descriptions)
- SWOT comparison with evidence
- Click weaknesses to see competitor reviews

### 🔍 Evidence-Based Insights
- Every insight links to actual user reviews
- Filter evidence by issue, strength, or request
- Works for both your app and competitors
- Shows rating, version, date, and review text

### 💬 Query Console
- Ask questions in natural language
- "What are users saying about login issues?"
- "Why did our rating drop?"
- "What features are users requesting most?"
- AI-powered answers based on review data

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (v22+ recommended)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ReviewMonster.git
cd ReviewMonster

# Install dependencies
npm install

# Create .env file
echo "OPENAI_API_KEY=your-api-key-here" > .env

# Start the server
npm run dev
```

The server will run on `http://localhost:3000`

---

## 📖 API Documentation

See [API_DOCS.md](./API_DOCS.md) for complete API reference.

### Quick Example

```bash
# 1. Fetch app metadata
curl -X POST http://localhost:3000/apps/metadata \
  -H "Content-Type: application/json" \
  -d '{"appId": "1081530898"}'

# 2. Initialize analysis
curl -X POST http://localhost:3000/init \
  -H "Content-Type: application/json" \
  -d '{"refresh": true}'

# 3. Get overview
curl http://localhost:3000/overview

# 4. Get evidence for specific issue
curl http://localhost:3000/evidence/issue/login_bug

# 5. Ask a natural language query
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the top complaints?"}'
```

---

## 🏗️ Architecture

```
ReviewMonster/
├── api/
│   └── server.js           # Express API server
├── Agents/
│   ├── AgentManager.js     # Orchestrates all agents
│   ├── InitAgent.js        # Handles app initialization
│   ├── CompetitorAgent.js  # Competitor analysis
│   ├── MemoAgent.js        # Generates decision memos
│   └── YearlyReportAgent.js
├── tools/
│   ├── fetchReviews.js     # App Store review fetcher
│   ├── analyzeReview.js    # AI review analysis
│   ├── generateMemo.js     # Executive memo generator
│   ├── competitorDiscovery.js
│   ├── regressionEngine.js # Rating driver analysis
│   ├── releaseTimeline.js
│   ├── impactModel.js
│   └── cache.js            # Review analysis cache
├── data/                   # JSON data storage
└── node_modules/
```

---

## 🛠️ Technology Stack

- **Backend:** Node.js + Express
- **AI:** OpenAI GPT-4o-mini (for review analysis)
- **Data Source:** Apple App Store RSS & iTunes API
- **Caching:** In-memory + JSON file cache
- **CORS:** Enabled for frontend integration

---

## 📋 Endpoints Overview

### Onboarding
- `POST /apps/metadata` - Fetch app metadata by App Store ID
- `POST /init` - Download and analyze reviews

### Core Screens
- `GET /overview` - Dashboard with executive summary
- `GET /your-product` - Deep dive into issues, requests, strengths
- `GET /release-timeline` - Version-by-version analysis
- `GET /impact-model` - Predictive impact analysis
- `GET /regression-tree` - Rating driver regression

### Competitors
- `POST /competitors/init` - Discover competitors
- `POST /competitors/run` - Fetch competitor data
- `POST /competitors/compare` - Generate SWOT analysis

### Insights
- `GET /evidence/:type/:item` - Get review evidence
- `POST /query` - Natural language queries

---

## 🎯 Roadmap

### V1.1 - High Priority
- [ ] Multi-app workspace support
- [ ] Manual competitor management
- [ ] Time period comparison ("vs. last 90 days")
- [ ] Export to PDF/CSV
- [ ] Smart alerts configuration

### V1.2 - Medium Priority
- [ ] Advanced filters (version, rating, date)
- [ ] Release planning assistant
- [ ] Competitive trends timeline
- [ ] Review search & custom tagging
- [ ] Customizable dashboard widgets

### V2.0 - Future
- [ ] Predictive intelligence (sentiment forecasting)
- [ ] User cohort analysis
- [ ] Automated response suggestions
- [ ] Google Play Store support
- [ ] Team collaboration features
- [ ] Integrations (Jira, Linear, Amplitude, Zendesk)

---

## 🔧 Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-...
```

### Customization

**App ID Configuration:**
Edit the hardcoded App ID in:
- `tools/fetchReviews.js` (line 4)
- `tools/appStoreScraper.js` (line 3)

**Multi-app support** (V1.1) will make this dynamic.

---

## 📊 Example Use Cases

### Product Manager
> "I need to understand why our rating dropped after the last release."

```bash
curl http://localhost:3000/release-timeline
# Shows sentiment impact and new issues per version
```

### Engineering Lead
> "What's the most critical bug affecting users?"

```bash
curl http://localhost:3000/your-product
# Returns issues sorted by severity (critical/high/medium/low)
```

### CEO
> "Give me a quick summary of user feedback this quarter."

```bash
curl http://localhost:3000/overview
# Provides executive memo with key metrics and recommendations
```

### Competitive Analyst
> "How do we compare to our main competitor?"

```bash
curl -X POST http://localhost:3000/competitors/compare \
  -d '{"mainApp": {"appId": "1081530898"}, "competitorIds": ["123456789"]}'
# Returns SWOT comparison with evidence
```

---

## 🧪 Testing

```bash
# Run syntax check
node -c api/server.js

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Apple for App Store RSS feeds
- Express.js community
- All contributors

---

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Email: support@reviewmonster.dev
- Documentation: [API_DOCS.md](./API_DOCS.md)

---

## 🌟 Star History

If you find ReviewMonster useful, please consider giving it a star ⭐

---

**Built with ❤️ for Product Managers who want insights, not just data.**
