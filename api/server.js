const express = require("express");
require("dotenv").config();
const cors = require("cors");


//const ProductAgent = require("../agent/ProductAgent");
const { AgentManager } = require("../Agents/AgentManager");

const { fetchReviews } = require("../tools/fetchReviews");
const { analyzeReview } = require("../tools/analyzeReview");
const generateMemo = require("../tools/generateMemo").generateMemo;
const cache = require("../tools/cache");

const { InitAgent } = require("../Agents/InitAgent");
const { scrapeLastYear } = require("../tools/appStoreScraper");
const rawStore = require("../tools/rawReviewStore");

//const { CompetitorAgent } = require("../Agents/CompetitorAgent");
//const competitorAgent = new CompetitorAgent({ fetchReviews });

const app = express();

/* ------------------- CORS (MUST BE FIRST) ------------------- */
app.use(cors({
    origin: "http://localhost:4000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());


//app.options("/*", cors());

//app.use(express.json());
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

app.post("/competitors/compare", async (req, res) => {
    try {
        const swot = await manager.runCompetitorCompare();
        res.json(swot);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


app.post("/competitors/run", async (req, res) => {
    try {
        const appProfile = { appId: req.body?.ourAppId || "1081530898" };
        const reviews = require("../data/reviews_store.json");
        const ourIntel = require("../data/memory.json");

        const result = await manager.runCompetitorAnalysis({
            appProfile,
            reviews,
            ourIntel,
            opts: { days: 90 }
        });

        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


// app.post("/competitors/run", async (req, res) => {
//     try {
//         const { country = "us", k = 8, days = 30 } = req.body || {};
//         const appProfile = { appId: req.body?.ourAppId || "1081530898" };
//         const reviews = require("../data/reviews_store.json");
//         const ourIntel = require("../data/memory.json");

//         const result = await competitorAgent.run(appProfile, reviews, ourIntel, { country, k, days });
//         res.json(result);
//     } catch (e) {
//         res.status(400).json({ error: e.message });
//     }
// });

// app.get("/competitors/report", async (req, res) => {
//     const data = require("../data/competitive_memory.json");
//     res.json(data);
// });


app.listen(3000, () => {
    console.log("Stateless Product Intelligence Agent running on port 3000");
});
