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
    const { refresh = false } = req.body;

    try {
        const result = await initAgent.run({ refresh });
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Init failed" });
    }
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





app.listen(3000, () => {
    console.log("Stateless Product Intelligence Agent running on port 3000");
});
