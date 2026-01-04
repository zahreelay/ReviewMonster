const express = require("express");
require("dotenv").config();

//const ProductAgent = require("../agent/ProductAgent");
const { AgentManager } = require("../Agents/AgentManager");

const { fetchReviews } = require("../tools/fetchReviews");
const { analyzeReview } = require("../tools/analyzeReview");
const generateMemo = require("../tools/generateMemo").generateMemo;
const cache = require("../tools/cache");

const { InitAgent } = require("../Agents/InitAgent");
const { scrapeLastYear } = require("../tools/appStoreScraper");
const rawStore = require("../tools/rawReviewStore");



const app = express();
app.use(express.json());

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



app.post("/run-agent", async (req, res) => {
    const { days = 30 } = req.body;
    const result = await manager.run({ days });
    res.json(result);
});

app.listen(3000, () => {
    console.log("Stateless Product Intelligence Agent running on port 3000");
});
