# ReviewMonster UI

React-based user interface for the Product Intelligence Portal.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will run on `http://localhost:4000` and proxy API requests to the backend at `http://localhost:3000`.

## 📁 Project Structure

```
ui/
├── src/
│   ├── components/         # Reusable components
│   │   ├── Header.jsx     # Navigation header
│   │   └── EvidenceModal.jsx  # Review evidence viewer
│   ├── screens/           # Page components
│   │   ├── Onboarding.jsx      # App setup flow
│   │   ├── Overview.jsx        # Executive dashboard
│   │   ├── YourProduct.jsx     # Issues/strengths deep dive
│   │   ├── ReleaseTimeline.jsx # Version analysis
│   │   ├── Competitors.jsx     # Competitor discovery
│   │   ├── SwotComparison.jsx  # SWOT analysis
│   │   └── QueryConsole.jsx    # Natural language queries
│   ├── services/
│   │   └── api.js         # API client
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── styles.css         # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## 🎨 Features

### Onboarding Flow
- Enter App Store ID to fetch metadata
- Review and confirm app details
- Loading progress indicator
- App locked after confirmation

### Core Screens

#### **Overview Dashboard**
- Key metrics (total reviews, avg rating, sentiment)
- Critical alerts for rating drops
- Top issues, feature requests, and strengths
- Executive summary memo
- Click any item to see evidence

#### **Your Product**
- Sentiment distribution
- Issues with severity levels (critical/high/medium/low)
- Feature requests with demand indicators
- Strengths with supporting reviews
- Tabbed interface for easy navigation

#### **Release Timeline**
- Visual timeline of app versions
- Sentiment impact analysis
- New issues introduced per version
- Resolved issues per version
- Trend indicators (improved/declined/stable)

#### **Competitors**
- Discover similar apps automatically
- Match score based on genre and features
- Quick access to SWOT analysis
- Competitor ratings and metadata

#### **SWOT Comparison**
- Side-by-side analysis
- Strengths, Weaknesses, Opportunities, Threats
- Click any item to see actual user reviews
- Works for both your app and competitors

#### **Query Console**
- Natural language query interface
- Example queries to get started
- Conversation history
- AI-powered answers based on review data

### Evidence Modal
- View actual user reviews for any insight
- Shows rating, date, version, review text
- Works across all screens
- Supports both main app and competitor evidence

## 🛠️ Technology Stack

- **Framework:** React 18
- **Routing:** React Router v6
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Styling:** Vanilla CSS with CSS variables

## 🎯 API Integration

The UI connects to the ReviewMonster API backend. All API calls are proxied through Vite:

- `/api/*` → `http://localhost:3000/*`

### Key API Endpoints Used:

- `POST /apps/metadata` - Fetch app info
- `POST /init` - Initialize analysis
- `GET /overview` - Dashboard data
- `GET /your-product` - Product deep dive
- `GET /release-timeline` - Version analysis
- `POST /competitors/init` - Discover competitors
- `POST /competitors/compare` - SWOT analysis
- `GET /evidence/:type/:item` - Review evidence
- `POST /query` - Natural language queries

## 🎨 Design System

### Colors
```css
--primary: #2563eb (Blue)
--danger: #dc2626 (Red)
--warning: #f59e0b (Orange)
--success: #10b981 (Green)
--gray-*: #... (Gray scale)
```

### Components
- Cards with subtle shadows
- Badges for severity/demand indicators
- Modals for detailed views
- Loading spinners
- Alert banners
- Responsive grid system

## 📝 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Production
npm run build        # Build for production
npm run preview      # Preview production build
```

### Development Tips

1. **Backend Must Be Running:** Ensure the API server is running on port 3000
2. **Hot Reload:** Changes auto-reload in development
3. **Data Persistence:** App config and competitors cached in localStorage
4. **State Management:** React state + localStorage (no Redux needed)

## 🔧 Configuration

### Proxy Configuration
Edit `vite.config.js` to change API proxy settings:

```javascript
server: {
  port: 4000,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

## 🚢 Deployment

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains the static files

3. Deploy to any static hosting:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages

4. Configure environment variables for API endpoint if not using proxy

## 🔑 Key Features from PRD

✅ **Onboarding Flow**
- App Store ID input
- Metadata confirmation
- Loading states with progress
- App locking after setup

✅ **Evidence-First Approach**
- Click any insight to see actual reviews
- Modal with full review details
- Works for main app and competitors

✅ **SWOT Competitive Analysis**
- Discover competitors automatically
- Side-by-side comparison
- Evidence for each strength/weakness

✅ **Natural Language Queries**
- Ask questions in plain English
- AI-powered answers
- Example queries provided

✅ **Clean, Focused UI**
- No dashboard bloat
- Fast and responsive
- Evidence always one click away

## 📱 Responsive Design

The UI is fully responsive and works on:
- Desktop (1400px+)
- Tablet (768px - 1400px)
- Mobile (320px - 768px)

Grid layouts automatically adjust based on screen size.

## 🎯 Next Steps (Future Enhancements)

From the PRD roadmap:

### V1.1
- [ ] Multi-app workspace switcher
- [ ] Time period comparison
- [ ] Export to PDF/CSV
- [ ] Advanced filters

### V1.2
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Customizable dashboard
- [ ] Mobile app

### V2.0
- [ ] Team collaboration
- [ ] Comments on insights
- [ ] Real-time updates
- [ ] Integration with Jira/Linear

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [API Documentation](../API_DOCS.md)

## 🐛 Troubleshooting

### UI won't start
- Check Node.js version (v18+ required)
- Run `npm install` to ensure dependencies are installed

### API calls failing
- Ensure backend is running on port 3000
- Check CORS configuration in backend
- Verify proxy settings in `vite.config.js`

### Empty screens after onboarding
- Ensure `/init` endpoint completed successfully
- Check browser console for errors
- Verify data exists in localStorage

## 📄 License

ISC License - Same as parent project

---

**Built with ❤️ for Product Managers who want insights, not just data.**
