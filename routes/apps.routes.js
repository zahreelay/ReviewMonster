/**
 * App Routes - Phase 1A API Endpoints
 *
 * All endpoints follow the pattern: /api/apps/:appId/*
 */

const express = require("express");
const router = express.Router();

const appStorage = require("../tools/appStorage");
const { generateInsights, generateRatingHistory, generateIssueDeepDive, normalizeIssueKey } = require("../tools/insightsGenerator");
const { buildReleaseTimeline } = require("../tools/releaseTimeline");
const generateMemo = require("../tools/generateMemo").generateMemo;
const cache = require("../tools/cache");
const llm = require("../tools/llm");
const { analyzeReview } = require("../tools/analyzeReview");
const { scrapeLastYear } = require("../tools/appStoreScraper");

// Track init jobs per app
const initJobs = {};

/**
 * POST /api/apps/:appId/init
 * Initialize analysis for an app
 */
router.post("/:appId/init", async (req, res) => {
    const { appId } = req.params;
    const { refresh = false, bypassCache = false } = req.body;

    // Check if already running
    if (initJobs[appId]?.running) {
        return res.status(409).json({
            status: "already_running",
            progress: initJobs[appId].progress,
            total: initJobs[appId].total
        });
    }

    // Initialize job tracking
    initJobs[appId] = {
        running: true,
        progress: 0,
        total: 0,
        error: null,
        startedAt: new Date().toISOString()
    };

    res.json({
        status: "started",
        message: `Initialization started for app ${appId}. Poll /api/apps/${appId}/init/status for progress.`
    });

    // Run in background
    (async () => {
        try {
            // Step 1: Fetch metadata
            const metadataUrl = `https://itunes.apple.com/lookup?id=${appId}`;
            const metaResponse = await fetch(metadataUrl);
            const metaData = await metaResponse.json();
            const appInfo = metaData.results?.[0];

            if (!appInfo) {
                throw new Error("App not found in App Store");
            }

            const metadata = {
                appId: appInfo.trackId,
                name: appInfo.trackName,
                seller: appInfo.sellerName,
                icon: appInfo.artworkUrl512 || appInfo.artworkUrl100,
                rating: appInfo.averageUserRating,
                ratingCount: appInfo.userRatingCount,
                genre: appInfo.primaryGenreName,
                description: appInfo.description,
                version: appInfo.version,
                releaseDate: appInfo.currentVersionReleaseDate
            };

            appStorage.saveMetadata(appId, metadata);

            // Step 2: Get reviews
            let reviews = appStorage.loadReviews(appId);

            if (refresh || !reviews || reviews.length === 0) {
                console.log(`Scraping reviews for app ${appId}...`);
                reviews = await scrapeLastYear(appId);
                appStorage.saveReviews(appId, reviews);
                console.log(`Scraped ${reviews.length} reviews`);
            }

            if (!reviews || reviews.length === 0) {
                initJobs[appId].running = false;
                initJobs[appId].lastResult = {
                    status: "no_reviews",
                    message: "No reviews found for this app"
                };
                return;
            }

            initJobs[appId].total = reviews.length;

            // Step 3: Analyze reviews
            const analyzed = [];
            for (let i = 0; i < reviews.length; i++) {
                const review = reviews[i];
                const key = cache.makeReviewKey(review);
                let analysis = bypassCache ? null : cache.get(key);

                if (!analysis) {
                    analysis = await analyzeReview(review);
                    cache.set(key, analysis);
                }

                const parsedAnalysis = typeof analysis === "string" ? JSON.parse(analysis) : analysis;
                analyzed.push({
                    ...review,
                    ...parsedAnalysis
                });

                initJobs[appId].progress = i + 1;

                if ((i + 1) % 10 === 0) {
                    console.log(`Analyzed ${i + 1}/${reviews.length} reviews for app ${appId}`);
                }
            }

            // Step 4: Generate insights
            const insights = generateInsights(analyzed);
            appStorage.saveInsights(appId, insights);

            // Step 5: Generate rating history
            const ratingHistory = generateRatingHistory(reviews);
            appStorage.saveRatingHistory(appId, ratingHistory);

            // Step 6: Generate regression timeline
            const regression = buildReleaseTimeline(analyzed);
            appStorage.saveRegression(appId, regression);

            initJobs[appId].running = false;
            initJobs[appId].lastResult = {
                status: "ok",
                appId,
                name: metadata.name,
                totalReviews: reviews.length,
                totalAnalyzed: analyzed.length,
                completedAt: new Date().toISOString()
            };

            console.log(`Init completed for app ${appId}`);
        } catch (e) {
            console.error(`Init error for app ${appId}:`, e);
            initJobs[appId].running = false;
            initJobs[appId].error = e.message;
            initJobs[appId].lastResult = { status: "error", error: e.message };
        }
    })();
});

/**
 * GET /api/apps/:appId/init/status
 * Check init progress
 */
router.get("/:appId/init/status", (req, res) => {
    const { appId } = req.params;
    const job = initJobs[appId];

    if (!job) {
        return res.json({
            running: false,
            progress: 0,
            total: 0,
            message: "No init job found. Start with POST /api/apps/:appId/init"
        });
    }

    res.json({
        running: job.running,
        progress: job.progress,
        total: job.total,
        percentage: job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0,
        error: job.error,
        lastResult: job.lastResult,
        startedAt: job.startedAt
    });
});

/**
 * GET /api/apps/:appId/overview
 * Dashboard overview with metrics, quick insights, rating history
 */
router.get("/:appId/overview", async (req, res) => {
    try {
        const { appId } = req.params;

        const metadata = appStorage.loadMetadata(appId);
        if (!metadata) {
            return res.status(404).json({
                error: "App not found. Run /api/apps/:appId/init first."
            });
        }

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            return res.status(400).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        const ratingHistory = appStorage.loadRatingHistory(appId);

        // Quick insights
        const topIssue = insights.issues[0] || null;
        const topRequest = insights.requests[0] || null;
        const topStrength = insights.strengths[0] || null;

        // Rating trend
        let ratingTrend = { direction: "stable", change: 0, period: "3 months" };
        if (ratingHistory && ratingHistory.length >= 3) {
            const recent = ratingHistory.slice(-1)[0];
            const earlier = ratingHistory.slice(-4, -1);
            const earlierAvg = earlier.reduce((s, r) => s + r.avgRating, 0) / earlier.length;
            const change = parseFloat((recent.avgRating - earlierAvg).toFixed(2));
            ratingTrend = {
                direction: change > 0.1 ? "up" : change < -0.1 ? "down" : "stable",
                change,
                period: "3 months"
            };
        }

        // Generate memo
        const reviews = appStorage.loadReviews(appId);
        const analyzed = reviews.map(r => {
            const key = cache.makeReviewKey(r);
            const analysis = cache.get(key);
            return analysis ? { ...r, ...JSON.parse(analysis) } : r;
        }).filter(r => r.intent);

        const memo = generateMemo(analyzed);

        res.json({
            metadata,
            quickInsights: {
                topIssue: topIssue ? {
                    title: topIssue.title,
                    severity: topIssue.severity,
                    count: topIssue.count
                } : null,
                topRequest: topRequest ? {
                    title: topRequest.title,
                    count: topRequest.count
                } : null,
                topStrength: topStrength ? {
                    title: topStrength.title,
                    count: topStrength.count
                } : null,
                ratingTrend
            },
            metrics: insights.summary,
            ratingHistory,
            memo
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/issues
 * List all issues with severity
 */
router.get("/:appId/issues", (req, res) => {
    try {
        const { appId } = req.params;

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        res.json({
            issues: insights.issues,
            totalCount: insights.issues.length
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/issues/:issueId
 * Issue deep-dive with timeline, impact, recommendations
 */
router.get("/:appId/issues/:issueId", (req, res) => {
    try {
        const { appId, issueId } = req.params;

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        const issue = insights.issues.find(i => i.id === issueId);
        if (!issue) {
            return res.status(404).json({
                error: `Issue '${issueId}' not found`
            });
        }

        // Get all analyzed reviews for context
        const reviews = appStorage.loadReviews(appId);
        const analyzed = reviews.map(r => {
            const key = cache.makeReviewKey(r);
            const analysis = cache.get(key);
            return analysis ? { ...r, ...JSON.parse(analysis) } : r;
        }).filter(r => r.intent);

        const deepDive = generateIssueDeepDive(issue, analyzed);

        res.json(deepDive);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/requests
 * List all feature requests with demand ranking
 */
router.get("/:appId/requests", (req, res) => {
    try {
        const { appId } = req.params;

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        res.json({
            requests: insights.requests,
            totalCount: insights.requests.length
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/strengths
 * List all strengths
 */
router.get("/:appId/strengths", (req, res) => {
    try {
        const { appId } = req.params;

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        res.json({
            strengths: insights.strengths,
            totalCount: insights.strengths.length
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/regression-timeline
 * Version-wise issue tracking with rating correlation
 */
router.get("/:appId/regression-timeline", (req, res) => {
    try {
        const { appId } = req.params;
        const { view = "version" } = req.query;

        const regression = appStorage.loadRegression(appId);
        if (!regression) {
            return res.status(404).json({
                error: "No regression data available. Run /api/apps/:appId/init first."
            });
        }

        res.json({
            viewBy: view,
            ...regression
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/apps/:appId/query
 * Natural language query about the app's reviews
 */
router.post("/:appId/query", async (req, res) => {
    try {
        const { appId } = req.params;
        const { query, bypassCache = false } = req.body;

        if (!query) {
            return res.status(400).json({ error: "query is required" });
        }

        const insights = appStorage.loadInsights(appId);
        const metadata = appStorage.loadMetadata(appId);

        if (!insights || !metadata) {
            return res.status(404).json({
                error: "No data available. Run /api/apps/:appId/init first."
            });
        }

        // Build context
        const topIssues = insights.issues.slice(0, 10);
        const topRequests = insights.requests.slice(0, 10);
        const topStrengths = insights.strengths.slice(0, 5);

        const context = `
You are a product intelligence assistant analyzing reviews for "${metadata.name}".

App Info:
- Rating: ${metadata.rating} stars
- Total Reviews Analyzed: ${insights.summary.totalReviews}
- Sentiment: ${insights.summary.sentiment.positive} positive, ${insights.summary.sentiment.negative} negative, ${insights.summary.sentiment.neutral} feature requests

Top Issues:
${topIssues.map(i => `- ${i.title} (${i.severity}, ${i.count} reports)`).join("\n")}

Top Feature Requests:
${topRequests.map(r => `- ${r.title} (${r.count} requests, ${r.demand} demand)`).join("\n")}

Top Strengths:
${topStrengths.map(s => `- ${s.title} (${s.count} mentions)`).join("\n")}

Answer the user's query concisely and accurately based on this data. Only use information from the review analysis.
`;

        // Cache key
        const contextHash = `${appId}|${insights.summary.totalReviews}|${topIssues.map(i => i.id).join(",")}`;
        const queryKey = cache.makeQueryKey(query, contextHash);

        let answer = bypassCache ? null : cache.get(queryKey);

        if (!answer) {
            answer = await llm.chat({
                messages: [
                    { role: "system", content: context },
                    { role: "user", content: query }
                ],
                model: "fast",
                temperature: 0.7,
                maxTokens: 500
            });
            cache.set(queryKey, answer);
        }

        res.json({
            query,
            answer,
            context: {
                appName: metadata.name,
                reviewsAnalyzed: insights.summary.totalReviews,
                avgRating: insights.summary.avgRating
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps
 * List all analyzed apps
 */
router.get("/", (req, res) => {
    try {
        const appIds = appStorage.listApps();
        const apps = appIds.map(appId => {
            const metadata = appStorage.loadMetadata(appId);
            return metadata || { appId };
        });

        res.json({ apps });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
