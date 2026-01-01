const express = require("express");
const ProductAgent = require("../agent/ProductAgent");

const app = express();
app.use(express.json());

const agent = new ProductAgent();

app.post("/ingest", async (req, res) => {
    try {
        const memo = await agent.ingestAndSummarize();
        res.type("text/plain").send(memo);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching reviews / generating memo");
    }
});

app.listen(3000, () => {
    console.log("Stateless Product Intelligence Agent running on port 3000");
});
