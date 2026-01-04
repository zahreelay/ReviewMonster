const express = require("express");
require("dotenv").config();

const ProductAgent = require("../agent/ProductAgent");
const { AgentManager } = require("../Agents/AgentManager");

const { fetchReviews } = require("../tools/fetchReviews");
const { analyzeReview } = require("../tools/analyzeReview");
const generateMemo = require("../tools/generateMemo").generateMemo;
const cache = require("../tools/cache");
const app = express();
app.use(express.json());

const agent = new ProductAgent();
const manager = new AgentManager({
    fetchReviews,
    analyzeReview,
    generateMemo,
    cache
});
app.post("/ingest", async (req, res) => {
    try {
        const memo = await agent.ingestAndSummarize();
        res.type("text/plain").send(memo);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching reviews / generating memo");
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
