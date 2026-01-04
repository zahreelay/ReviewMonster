const { AgentManager } = require("./Agents/AgentManager");
const cache = require("./tools/cache");
const fs = require("fs");
const path = require("path");

// Mock dependencies
const mockFetchReviews = async () => [{
    text: "Great app!",
    rating: 5,
    version: "1.0",
    title: "Review",
    issues: []
}];

const mockAnalyzeReview = async (review) => JSON.stringify({
    intent: "praise",
    issues: [],
    summary: "User likes it"
});

const mockGenerateMemo = (reviews) => "MOCKED MEMO CONTENT";

async function verify() {
    console.log("Starting verification...");

    const cachePath = path.join(__dirname, "data/agent_cache.json");
    // Ensure data directory exists
    const dataDir = path.dirname(cachePath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Reset cache
    fs.writeFileSync(cachePath, "{}");
    console.log("Cleared existing cache");

    const manager = new AgentManager({
        fetchReviews: mockFetchReviews,
        analyzeReview: mockAnalyzeReview,
        generateMemo: mockGenerateMemo,
        cache
    });

    console.log("Running agent...");
    await manager.run({ days: 1 });

    // Check if cache file exists and has content
    if (fs.existsSync(cachePath)) {
        const content = fs.readFileSync(cachePath, "utf-8");
        const json = JSON.parse(content);
        const keys = Object.keys(json);
        console.log(`Cache created at ${cachePath}`);
        console.log(`Cache entries: ${keys.length}`);

        if (keys.length > 0) {
            console.log("SUCCESS: Cache populated");
        } else {
            console.log("FAILURE: Cache empty");
        }
    } else {
        console.log(`FAILURE: Cache file not found at ${cachePath}`);
    }
}

verify().catch(console.error);
