const express = require("express");
require("dotenv").config();

//const ProductAgent = require("../agent/ProductAgent");
const { AgentManager } = require("../Agents/AgentManager");

const { fetchReviews } = require("../tools/fetchReviews");
const { analyzeReview } = require("../tools/analyzeReview");
const generateMemo = require("../tools/generateMemo").generateMemo;
const cache = require("../tools/cache");
const app = express();
app.use(express.json());

const manager = new AgentManager({
    fetchReviews,
    analyzeReview,
    generateMemo,
    cache
});

app.post("/run-agent", async (req, res) => {
    const { days = 30 } = req.body;
    const result = await manager.run({ days });
    res.json(result);
});

app.listen(3000, () => {
    console.log("Stateless Product Intelligence Agent running on port 3000");
});
