const express = require("express");
require("dotenv").config();
const cors = require("cors");



const { AgentManager } = require("../Agents/AgentManager");

const { fetchReviews } = require("../tools/fetchReviews");
const { analyzeReview } = require("../tools/analyzeReview");
const generateMemo = require("../tools/generateMemo").generateMemo;
const cache = require("../tools/cache");

const { InitAgent } = require("../Agents/InitAgent");
const { scrapeLastYear } = require("../tools/appStoreScraper");
const rawStore = require("../tools/rawReviewStore");

const fs = require("fs");
const path = require("path");

// Track init job status
let initStatus = {
    running: false,
    progress: 0,
    total: 0,
    error: null,
    lastResult: null
};

const app = express();

/* ------------------- CORS (MUST BE FIRST) ------------------- */
app.use(cors({
    origin: "http://localhost:4000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());



/* ----------------------------------------------------------- */

const manager = new AgentManager({
    fetchReviews,
    analyzeReview,
    generateMemo,
    cache
});

const initAgent = new InitAgent({
    scraper: { scrapeLastYear },
    rawStore,
    analyzeReview,
    cache
});

app.post("/init", async (req, res) => {
    const { refresh = false, async: runAsync = true } = req.body;

    // If already running, return current status
    if (initStatus.running) {
        return res.status(409).json({
            status: "already_running",
            progress: initStatus.progress,
            total: initStatus.total
        });
    }

    // For sync mode (not recommended for large datasets)
    if (!runAsync) {
        try {
            const result = await initAgent.run({ refresh });
            res.json(result);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Init failed" });
        }
        return;
    }

    // Async mode: return immediately and process in background
    initStatus = {
        running: true,
        progress: 0,
        total: 0,
        error: null,
        lastResult: null,
        startedAt: new Date().toISOString()
    };

    res.json({
        status: "started",
        message: "Initialization started. Poll /init/status for progress."
    });

    // Run in background
    (async () => {
        try {
            let reviews = rawStore.getReviews();

            if (refresh) {
                console.log("Scraping reviews...");
                reviews = await scrapeLastYear();
                rawStore.saveReviews(reviews);
                console.log(`Scraped ${reviews.length} reviews`);
            }

            if (!reviews.length) {
                initStatus.running = false;
                initStatus.lastResult = {
                    status: "no_data",
                    message: "Raw store empty. Run with refresh=true first."
                };
                return;
            }

            initStatus.total = reviews.length;
            const analyzed = [];

            for (let i = 0; i < reviews.length; i++) {
                const review = reviews[i];
                const key = cache.makeReviewKey(review);
                let analysis = cache.get(key);

                if (!analysis) {
                    analysis = await analyzeReview(review);
                    cache.set(key, analysis);
                }

                analyzed.push({
                    ...JSON.parse(analysis),
                    rating: review.rating,
                    date: review.date,
                    version: review.version
                });

                initStatus.progress = i + 1;

                // Log progress every 10 reviews
                if ((i + 1) % 10 === 0) {
                    console.log(`Analyzed ${i + 1}/${reviews.length} reviews`);
                }
            }

            initStatus.running = false;
            initStatus.lastResult = {
                status: "ok",
                totalRawReviews: reviews.length,
                totalAnalyzed: analyzed.length,
                updatedAt: new Date().toISOString()
            };
            console.log("Init completed successfully");
        } catch (e) {
            console.error("Init error:", e);
            initStatus.running = false;
            initStatus.error = e.message;
            initStatus.lastResult = { status: "error", error: e.message };
        }
    })();
});

app.get("/init/status", (req, res) => {
    res.json({
        running: initStatus.running,
        progress: initStatus.progress,
        total: initStatus.total,
        percentage: initStatus.total > 0
            ? Math.round((initStatus.progress / initStatus.total) * 100)
            : 0,
        error: initStatus.error,
        lastResult: initStatus.lastResult,
        startedAt: initStatus.startedAt
    });
});

app.get("/yearly-report", async (req, res) => {
    try {
        const result = await manager.runYearlyReport();
        console.log("Yearly report generated:", result);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message });
    }
});

app.get("/regression-tree", async (req, res) => {
    try {
        const result = await manager.runRegressionTree();
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/run-agent", async (req, res) => {
    const { days = 30 } = req.body;
    const result = await manager.run({ days });
    res.json(result);
});

app.get("/release-timeline", async (req, res) => {
    try {
        const result = await manager.runReleaseTimeline();
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.get("/impact-model", async (req, res) => {
    try {
        const result = await manager.runImpactModel();
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/competitors/init", async (req, res) => {
    try {
        const appProfile = { appId: req.body?.ourAppId || "1081530898" };
        const reviews = require("../data/reviews_store.json");

        const competitors = await manager.runCompetitorInit({
            appProfile,
            reviews,
            opts: {
                country: req.body?.country || "us",
                k: 10
            }
        });

        res.json({ competitors });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


app.post("/competitors/run", async (req, res) => {
    try {
        const { mainApp, competitorIds, days = 90 } = req.body;

        if (!mainApp?.appId) {
            return res.status(400).json({
                error: "mainApp.appId is required"
            });
        }

        if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
            return res.status(400).json({
                error: "competitorIds[] is required"
            });
        }

        const result = await manager.runCompetitorRun({
            mainApp,
            competitorIds,
            days
        });

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message });
    }
});

app.post("/competitors/compare", async (req, res) => {
    try {
        const { mainApp, competitorIds, days = 90 } = req.body;

        if (!mainApp?.appId) {
            return res.status(400).json({ error: "mainApp.appId is required" });
        }

        if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
            return res.status(400).json({ error: "competitorIds[] is required" });
        }

        const result = await manager.runCompetitorCompare({
            mainApp,
            competitorIds,
            days
        });

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message });
    }
});

/* ------------------- NEW PRD ENDPOINTS ------------------- */

// Fetch app metadata from App Store (Onboarding Step 1)
app.post("/apps/metadata", async (req, res) => {
    try {
        const { appId, country = "us" } = req.body;

        if (!appId) {
            return res.status(400).json({ error: "appId is required" });
        }

        const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(country)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ error: "iTunes lookup failed" });
        }

        const data = await response.json();
        const app = data.results?.[0];

        if (!app) {
            return res.status(404).json({ error: "App not found" });
        }

        res.json({
            appId: app.trackId,
            name: app.trackName,
            seller: app.sellerName,
            icon: app.artworkUrl512 || app.artworkUrl100,
            rating: app.averageUserRating,
            ratingCount: app.userRatingCount,
            genre: app.primaryGenreName,
            description: app.description,
            version: app.version,
            releaseDate: app.currentVersionReleaseDate
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Get overview/executive summary (Dashboard Screen)
app.get("/overview", async (req, res) => {
    try {
        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            return res.status(400).json({
                error: "No reviews available. Run /init first."
            });
        }

        // Get analyzed reviews from cache
        const analyzed = [];
        for (const review of reviews) {
            const key = cache.makeReviewKey(review);
            let analysis = cache.get(key);

            if (analysis) {
                analysis = JSON.parse(analysis);
                analyzed.push({ ...review, ...analysis });
            }
        }

        if (!analyzed.length) {
            return res.status(400).json({
                error: "No analyzed reviews. Run /init with analysis."
            });
        }

        // Calculate metrics
        const total = analyzed.length;
        const avgRating = (analyzed.reduce((s, r) => s + r.rating, 0) / total).toFixed(2);

        // Sentiment distribution
        const sentiment = {
            positive: analyzed.filter(r => r.intent === "praise").length,
            neutral: analyzed.filter(r => r.intent === "feature_request").length,
            negative: analyzed.filter(r => r.intent === "complaint").length
        };

        // Top issues
        const issueFreq = {};
        analyzed.forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(issue => {
                    issueFreq[issue] = (issueFreq[issue] || 0) + 1;
                });
            }
        });
        const topIssues = Object.entries(issueFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));

        // Top feature requests
        const requestFreq = {};
        analyzed.filter(r => r.intent === "feature_request").forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(req => {
                    requestFreq[req] = (requestFreq[req] || 0) + 1;
                });
            }
        });
        const topRequests = Object.entries(requestFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));

        // What's working (top praises)
        const praiseFreq = {};
        analyzed.filter(r => r.intent === "praise").forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(praise => {
                    praiseFreq[praise] = (praiseFreq[praise] || 0) + 1;
                });
            }
        });
        const topPraises = Object.entries(praiseFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));

        // Critical alerts (low rating spikes)
        const recentLowRatings = analyzed
            .filter(r => r.rating <= 2)
            .slice(0, 10);

        const alerts = [];
        if (recentLowRatings.length > total * 0.3) {
            alerts.push({
                severity: "high",
                message: `${recentLowRatings.length} low ratings (1-2★) detected`,
                type: "rating_drop"
            });
        }

        res.json({
            metrics: {
                totalReviews: total,
                avgRating: parseFloat(avgRating),
                sentiment
            },
            alerts,
            topIssues,
            topRequests,
            whatsWorking: topPraises,
            summary: generateMemo(analyzed)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Get "Your Product" deep dive (issues, strengths, requests with severity)
app.get("/your-product", async (req, res) => {
    try {
        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            return res.status(400).json({
                error: "No reviews available. Run /init first."
            });
        }

        const analyzed = [];
        for (const review of reviews) {
            const key = cache.makeReviewKey(review);
            let analysis = cache.get(key);

            if (analysis) {
                analysis = JSON.parse(analysis);
                analyzed.push({ ...review, ...analysis });
            }
        }

        // Group by intent
        const complaints = analyzed.filter(r => r.intent === "complaint");
        const requests = analyzed.filter(r => r.intent === "feature_request");
        const praises = analyzed.filter(r => r.intent === "praise");

        // Calculate issue severity based on frequency and rating
        const issueDetails = {};
        complaints.forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(issue => {
                    if (!issueDetails[issue]) {
                        issueDetails[issue] = {
                            count: 0,
                            totalRating: 0,
                            reviews: []
                        };
                    }
                    issueDetails[issue].count++;
                    issueDetails[issue].totalRating += r.rating;
                    issueDetails[issue].reviews.push({
                        text: r.text,
                        rating: r.rating,
                        date: r.date,
                        version: r.version
                    });
                });
            }
        });

        const issues = Object.entries(issueDetails)
            .map(([text, data]) => {
                const avgRating = data.totalRating / data.count;
                let severity = "low";
                if (data.count > 10 && avgRating < 2.5) severity = "critical";
                else if (data.count > 5 && avgRating < 3) severity = "high";
                else if (data.count > 3) severity = "medium";

                return {
                    text,
                    count: data.count,
                    avgRating: parseFloat(avgRating.toFixed(2)),
                    severity,
                    evidence: data.reviews.slice(0, 5)
                };
            })
            .sort((a, b) => b.count - a.count);

        // Feature requests with demand
        const requestDetails = {};
        requests.forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(req => {
                    if (!requestDetails[req]) {
                        requestDetails[req] = { count: 0, reviews: [] };
                    }
                    requestDetails[req].count++;
                    requestDetails[req].reviews.push({
                        text: r.text,
                        rating: r.rating,
                        date: r.date
                    });
                });
            }
        });

        const featureRequests = Object.entries(requestDetails)
            .map(([text, data]) => ({
                text,
                count: data.count,
                demand: data.count > 10 ? "high" : data.count > 5 ? "medium" : "low",
                evidence: data.reviews.slice(0, 5)
            }))
            .sort((a, b) => b.count - a.count);

        // Strengths
        const strengthDetails = {};
        praises.forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(praise => {
                    if (!strengthDetails[praise]) {
                        strengthDetails[praise] = { count: 0, reviews: [] };
                    }
                    strengthDetails[praise].count++;
                    strengthDetails[praise].reviews.push({
                        text: r.text,
                        rating: r.rating,
                        date: r.date
                    });
                });
            }
        });

        const strengths = Object.entries(strengthDetails)
            .map(([text, data]) => ({
                text,
                count: data.count,
                evidence: data.reviews.slice(0, 5)
            }))
            .sort((a, b) => b.count - a.count);

        // Sentiment distribution
        const sentiment = {
            positive: praises.length,
            neutral: requests.length,
            negative: complaints.length
        };

        res.json({
            sentiment,
            issues,
            featureRequests,
            strengths,
            totalReviews: analyzed.length
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Get evidence (reviews) for a specific issue/weakness
app.get("/evidence/:type/:item", async (req, res) => {
    try {
        const { type, item } = req.params;
        const { appId, competitorId } = req.query;

        let reviews = [];

        // Determine which dataset to use
        if (competitorId) {
            // Load competitor dataset
            const datasetPath = path.join(__dirname, "../data/competitive_dataset.json");
            if (!fs.existsSync(datasetPath)) {
                return res.status(404).json({
                    error: "Competitor data not found. Run /competitors/run first."
                });
            }
            const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
            const competitor = dataset.competitors[competitorId];

            if (!competitor) {
                return res.status(404).json({ error: "Competitor not found" });
            }

            reviews = competitor.analyzed || [];
        } else {
            // Use main app reviews
            const raw = rawStore.getReviews();
            const analyzed = [];

            for (const review of raw) {
                const key = cache.makeReviewKey(review);
                let analysis = cache.get(key);

                if (analysis) {
                    analysis = JSON.parse(analysis);
                    analyzed.push({ ...review, ...analysis });
                }
            }

            reviews = analyzed;
        }

        // Filter reviews by type and item
        const itemLower = decodeURIComponent(item).toLowerCase();
        const filtered = reviews.filter(r => {
            if (!Array.isArray(r.issues)) return false;

            // Check if this review contains the item
            const hasItem = r.issues.some(i =>
                String(i).toLowerCase().includes(itemLower) ||
                itemLower.includes(String(i).toLowerCase())
            );

            if (!hasItem) return false;

            // Filter by type if specified
            if (type === "issue" || type === "weakness") {
                return r.intent === "complaint";
            } else if (type === "request" || type === "opportunity") {
                return r.intent === "feature_request";
            } else if (type === "strength" || type === "praise") {
                return r.intent === "praise";
            }

            return true;
        });

        // Format evidence
        const evidence = filtered.map(r => ({
            text: r.text,
            title: r.title || "",
            rating: r.rating,
            date: r.date,
            version: r.version,
            user: r.user
        }));

        res.json({
            type,
            item: decodeURIComponent(item),
            count: evidence.length,
            evidence
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Natural language query endpoint (Query Console)
app.post("/query", async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: "query is required" });
        }

        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            return res.status(400).json({
                error: "No reviews available. Run /init first."
            });
        }

        // Get analyzed reviews
        const analyzed = [];
        for (const review of reviews) {
            const key = cache.makeReviewKey(review);
            let analysis = cache.get(key);

            if (analysis) {
                analysis = JSON.parse(analysis);
                analyzed.push({ ...review, ...analysis });
            }
        }

        // Use OpenAI to answer the query based on review data
        const OpenAI = require("openai");
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Prepare context with review summary
        const total = analyzed.length;
        const avgRating = (analyzed.reduce((s, r) => s + r.rating, 0) / total).toFixed(2);

        const issueFreq = {};
        analyzed.forEach(r => {
            if (Array.isArray(r.issues)) {
                r.issues.forEach(issue => {
                    issueFreq[issue] = (issueFreq[issue] || 0) + 1;
                });
            }
        });

        const topIssues = Object.entries(issueFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const context = `
You are a product intelligence assistant analyzing app reviews.

Dataset Summary:
- Total Reviews: ${total}
- Average Rating: ${avgRating}
- Top Issues: ${topIssues.map(([k, v]) => `${k} (${v})`).join(", ")}

Sample Reviews:
${analyzed.slice(0, 20).map(r => `[${r.rating}★] ${r.text.slice(0, 200)}`).join("\n")}

Answer the user's query concisely and accurately based on this data.
`;

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: context },
                { role: "user", content: query }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const answer = response.choices[0].message.content;

        res.json({
            query,
            answer,
            context: {
                reviewsAnalyzed: total,
                avgRating: parseFloat(avgRating)
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});



app.listen(3000, () => {
    console.log("Stateless Product Intelligence Agent running on port 3000");
});
