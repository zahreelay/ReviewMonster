import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Onboarding
  fetchAppMetadata: (appId, country = 'us') =>
    api.post('/apps/metadata', { appId, country }),

  initializeApp: (refresh = false) =>
    api.post('/init', { refresh }),

  // Core Screens
  getOverview: () => api.get('/overview'),

  getYourProduct: () => api.get('/your-product'),

  getReleaseTimeline: () => api.get('/release-timeline'),

  getImpactModel: () => api.get('/impact-model'),

  getRegressionTree: () => api.get('/regression-tree'),

  getYearlyReport: () => api.get('/yearly-report'),

  // Competitors
  discoverCompetitors: (ourAppId, country = 'us') =>
    api.post('/competitors/init', { ourAppId, country }),

  fetchCompetitorData: (mainApp, competitorIds, days = 90) =>
    api.post('/competitors/run', { mainApp, competitorIds, days }),

  compareCompetitors: (mainApp, competitorIds, days = 90) =>
    api.post('/competitors/compare', { mainApp, competitorIds, days }),

  // Evidence
  getEvidence: (type, item, competitorId = null) => {
    const params = competitorId ? `?competitorId=${competitorId}` : '';
    return api.get(`/evidence/${type}/${encodeURIComponent(item)}${params}`);
  },

  // Query Console
  query: (query) => api.post('/query', { query }),
};

export default apiService;
