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
const logger = require("../tools/logger");

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
        const log = logger.child({ appId });
        try {
            log.info("Starting app initialization");

            // Step 1: Fetch metadata
            log.info("Fetching app metadata from iTunes API");
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
            log.info("Saved app metadata", { name: metadata.name });

            // Step 2: Get reviews
            let reviews = appStorage.loadReviews(appId);

            if (refresh || !reviews || reviews.length === 0) {
                log.info("Scraping reviews from App Store");
                reviews = await scrapeLastYear(appId);
                appStorage.saveReviews(appId, reviews);
                log.info("Scraped reviews", { count: reviews.length });
            } else {
                log.info("Using cached reviews", { count: reviews.length });
            }

            if (!reviews || reviews.length === 0) {
                log.warn("No reviews found for this app");
                initJobs[appId].running = false;
                initJobs[appId].lastResult = {
                    status: "no_reviews",
                    message: "No reviews found for this app"
                };
                return;
            }

            initJobs[appId].total = reviews.length;

            // Step 3: Analyze reviews
            log.info("Starting review analysis", { total: reviews.length, bypassCache });
            const analyzed = [];
            let cacheHits = 0;
            let cacheMisses = 0;

            for (let i = 0; i < reviews.length; i++) {
                const review = reviews[i];
                const key = cache.makeReviewKey(review);
                let analysis = bypassCache ? null : cache.get(key);

                if (analysis) {
                    cacheHits++;
                } else {
                    cacheMisses++;
                    analysis = await analyzeReview(review);
                    cache.set(key, analysis);
                }

                const parsedAnalysis = typeof analysis === "string" ? JSON.parse(analysis) : analysis;
                analyzed.push({
                    ...review,
                    ...parsedAnalysis
                });

                initJobs[appId].progress = i + 1;

                if ((i + 1) % 50 === 0) {
                    log.info("Analysis progress", {
                        progress: i + 1,
                        total: reviews.length,
                        cacheHits,
                        cacheMisses
                    });
                }
            }

            log.info("Review analysis complete", { cacheHits, cacheMisses });

            // Step 4: Generate insights
            log.info("Generating insights");
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

            log.info("Init completed successfully", {
                name: metadata.name,
                reviewCount: reviews.length,
                issueCount: insights.issues.length,
                requestCount: insights.requests.length
            });
        } catch (e) {
            logger.error("Init error", { appId, error: e.message });
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
        logger.debug("No init job found", { appId });
        return res.json({
            running: false,
            progress: 0,
            total: 0,
            message: "No init job found. Start with POST /api/apps/:appId/init"
        });
    }

    logger.debug("Init status check", {
        appId,
        running: job.running,
        progress: job.progress,
        total: job.total
    });

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
        logger.info("Getting app overview", { appId });

        const metadata = appStorage.loadMetadata(appId);
        if (!metadata) {
            logger.warn("App not found", { appId });
            return res.status(404).json({
                error: "App not found. Run /api/apps/:appId/init first."
            });
        }

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            logger.warn("No insights available", { appId });
            return res.status(400).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        const ratingHistory = appStorage.loadRatingHistory(appId);

        // Quick insights with sample reviews
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

        logger.info("Overview generated", {
            appId,
            issueCount: insights.issues.length,
            requestCount: insights.requests.length
        });

        res.json({
            metadata,
            quickInsights: {
                topIssue: topIssue ? {
                    title: topIssue.title,
                    severity: topIssue.severity,
                    count: topIssue.count,
                    sampleReviews: (topIssue.evidence || []).slice(0, 3)
                } : null,
                topRequest: topRequest ? {
                    title: topRequest.title,
                    count: topRequest.count,
                    sampleReviews: (topRequest.evidence || []).slice(0, 3)
                } : null,
                topStrength: topStrength ? {
                    title: topStrength.title,
                    count: topStrength.count,
                    sampleReviews: (topStrength.evidence || []).slice(0, 3)
                } : null,
                ratingTrend
            },
            metrics: insights.summary,
            ratingHistory,
            memo
        });
    } catch (e) {
        logger.error("Error getting overview", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/issues
 * List all issues with severity and sample reviews
 */
router.get("/:appId/issues", (req, res) => {
    try {
        const { appId } = req.params;
        const { includeEvidence = "true" } = req.query;
        logger.info("Getting issues", { appId });

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            logger.warn("No insights available", { appId });
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        // Include evidence (sample reviews) by default
        const issues = includeEvidence === "true"
            ? insights.issues
            : insights.issues.map(({ evidence, ...rest }) => rest);

        logger.info("Returning issues", { appId, count: issues.length });

        res.json({
            issues,
            totalCount: insights.issues.length
        });
    } catch (e) {
        logger.error("Error getting issues", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/issues/:issueId
 * Issue deep-dive with timeline, impact, recommendations, and sample reviews
 */
router.get("/:appId/issues/:issueId", (req, res) => {
    try {
        const { appId, issueId } = req.params;
        logger.info("Getting issue deep-dive", { appId, issueId });

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            logger.warn("No insights available", { appId });
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        const issue = insights.issues.find(i => i.id === issueId);
        if (!issue) {
            logger.warn("Issue not found", { appId, issueId });
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

        logger.info("Issue deep-dive generated", {
            appId,
            issueId,
            evidenceCount: deepDive.evidence?.length || 0
        });

        res.json(deepDive);
    } catch (e) {
        logger.error("Error getting issue deep-dive", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/requests
 * List all feature requests with demand ranking and sample reviews
 */
router.get("/:appId/requests", (req, res) => {
    try {
        const { appId } = req.params;
        const { includeEvidence = "true" } = req.query;
        logger.info("Getting feature requests", { appId });

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            logger.warn("No insights available", { appId });
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        // Include evidence (sample reviews) by default
        const requests = includeEvidence === "true"
            ? insights.requests
            : insights.requests.map(({ evidence, ...rest }) => rest);

        logger.info("Returning feature requests", { appId, count: requests.length });

        res.json({
            requests,
            totalCount: insights.requests.length
        });
    } catch (e) {
        logger.error("Error getting requests", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps/:appId/strengths
 * List all strengths with sample reviews
 */
router.get("/:appId/strengths", (req, res) => {
    try {
        const { appId } = req.params;
        const { includeEvidence = "true" } = req.query;
        logger.info("Getting strengths", { appId });

        const insights = appStorage.loadInsights(appId);
        if (!insights) {
            logger.warn("No insights available", { appId });
            return res.status(404).json({
                error: "No insights available. Run /api/apps/:appId/init first."
            });
        }

        // Include evidence (sample reviews) by default
        const strengths = includeEvidence === "true"
            ? insights.strengths
            : insights.strengths.map(({ evidence, ...rest }) => rest);

        logger.info("Returning strengths", { appId, count: strengths.length });

        res.json({
            strengths,
            totalCount: insights.strengths.length
        });
    } catch (e) {
        logger.error("Error getting strengths", { error: e.message });
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
        logger.info("Getting regression timeline", { appId, view });

        const regression = appStorage.loadRegression(appId);
        if (!regression) {
            logger.warn("No regression data available", { appId });
            return res.status(404).json({
                error: "No regression data available. Run /api/apps/:appId/init first."
            });
        }

        logger.info("Returning regression timeline", {
            appId,
            versionCount: regression.timeline?.length || 0
        });

        res.json({
            viewBy: view,
            ...regression
        });
    } catch (e) {
        logger.error("Error getting regression timeline", { error: e.message });
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
        logger.info("Processing query", { appId, query, bypassCache });

        if (!query) {
            return res.status(400).json({ error: "query is required" });
        }

        const insights = appStorage.loadInsights(appId);
        const metadata = appStorage.loadMetadata(appId);

        if (!insights || !metadata) {
            logger.warn("No data available for query", { appId });
            return res.status(404).json({
                error: "No data available. Run /api/apps/:appId/init first."
            });
        }

        // Build context with sample reviews
        const topIssues = insights.issues.slice(0, 10);
        const topRequests = insights.requests.slice(0, 10);
        const topStrengths = insights.strengths.slice(0, 5);

        // Include sample reviews in context for better answers
        const sampleReviews = [
            ...topIssues.slice(0, 3).flatMap(i => (i.evidence || []).slice(0, 2)),
            ...topRequests.slice(0, 2).flatMap(r => (r.evidence || []).slice(0, 2)),
            ...topStrengths.slice(0, 2).flatMap(s => (s.evidence || []).slice(0, 2))
        ].slice(0, 10);

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

Sample Reviews:
${sampleReviews.map(r => `- "${r.text?.slice(0, 200)}..." (${r.rating}★)`).join("\n")}

Answer the user's query concisely and accurately based on this data. Only use information from the review analysis.
`;

        // Cache key
        const contextHash = `${appId}|${insights.summary.totalReviews}|${topIssues.map(i => i.id).join(",")}`;
        const queryKey = cache.makeQueryKey(query, contextHash);

        // Always check cache first (default behavior)
        let answer = bypassCache ? null : cache.get(queryKey);
        const cacheHit = !!answer;

        if (!answer) {
            logger.info("Cache miss, calling LLM", { appId, query });
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
        } else {
            logger.info("Cache hit for query", { appId });
        }

        logger.info("Query processed", { appId, cacheHit });

        res.json({
            query,
            answer,
            cached: cacheHit,
            context: {
                appName: metadata.name,
                reviewsAnalyzed: insights.summary.totalReviews,
                avgRating: insights.summary.avgRating
            }
        });
    } catch (e) {
        logger.error("Error processing query", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/apps
 * List all analyzed apps including competitors
 * Once an app is listed as a competitor and scraped, it appears here too
 */
router.get("/", (req, res) => {
    try {
        logger.info("Listing all apps");

        // Get all apps from the apps directory
        const appIds = appStorage.listApps();

        // Load global competitors list
        const globalCompetitors = appStorage.loadCompetitors();

        // Build apps array with metadata and competitor flag
        const apps = appIds.map(appId => {
            const metadata = appStorage.loadMetadata(appId);
            const isCompetitor = globalCompetitors.some(c => String(c.appId) === String(appId));

            return {
                ...(metadata || { appId }),
                isCompetitor
            };
        });

        // Also include competitors that have been discovered but not yet fully analyzed
        // These are in competitors.json but might not have a folder in /data/apps/
        const competitorsNotInApps = globalCompetitors.filter(
            c => !appIds.includes(String(c.appId))
        );

        logger.info("Listed apps", {
            analyzedCount: apps.length,
            competitorsCount: globalCompetitors.length,
            pendingCompetitors: competitorsNotInApps.length
        });

        res.json({
            apps,
            competitors: globalCompetitors,
            summary: {
                totalAnalyzed: apps.length,
                mainApps: apps.filter(a => !a.isCompetitor).length,
                analyzedCompetitors: apps.filter(a => a.isCompetitor).length,
                pendingCompetitors: competitorsNotInApps.length
            }
        });
    } catch (e) {
        logger.error("Error listing apps", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
