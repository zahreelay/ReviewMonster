const fs = require("fs");
const { discoverCompetitors } = require("../tools/competitorDiscovery");
const { ingestCompetitorReviews } = require("../tools/competitorIngestion");
//const { extractSignals } = require("../tools/reviewSignalExtractor");

/**
 * SAFETY: LLM output is not guaranteed JSON
 */
function safeParseAnalysis(text) {
    if (!text || typeof text !== "string") return {};
    try {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1) return {};
        return JSON.parse(text.slice(start, end + 1));
    } catch {
        return {};
    }
}

class CompetitorAgent {
    constructor(tools) {
        if (!tools?.analyzeReview) {
            throw new Error("CompetitorAgent requires analyzeReview");
        }

        this.fetchReviews = tools.fetchReviews;     // optional, kept for parity
        this.analyzeReview = tools.analyzeReview;   // REQUIRED
        this.cache = tools.cache;                   // optional
    }

    /**
     * STEP 1 — DISCOVERY ONLY
     * Returns top N competitors using App Store metadata
     */
    async discover(appProfile, reviews, opts = {}) {
        const competitors = await discoverCompetitors(appProfile, reviews, opts);
        return competitors.slice(0, opts.k || 10);
    }

    /**
     * STEP 2 — ANALYZE TOP 3 COMPETITORS (LAST 90 DAYS)
     */
    async run(appProfile, reviews, ourIntel, opts = {}) {
        const days = opts.days || 90;

        // Always re-discover so analysis is deterministic
        const competitors = await discoverCompetitors(appProfile, reviews, opts);
        const top3 = competitors.slice(0, 3);

        const output = {};

        for (const c of top3) {
            const raw = await ingestCompetitorReviews(
                [c],
                this.fetchReviews,
                { days }
            );

            const reviewList = raw[c.appId]?.reviews || [];
            const analyzed = [];

            for (const r of reviewList) {
                const cacheKey = `competitor:${c.appId}:${r.text}`;
                let parsed = null;

                if (this.cache) {
                    const cached = this.cache.get(cacheKey);
                    if (cached) parsed = safeParseAnalysis(cached);
                }

                if (!parsed) {
                    const rawAnalysis = await this.analyzeReview(r);
                    parsed = safeParseAnalysis(rawAnalysis);
                    if (this.cache) this.cache.set(cacheKey, rawAnalysis);
                }

                analyzed.push({ ...r, ...parsed });
            }

            output[c.name] = {
                appId: c.appId,
                reviewCount: reviewList.length,
                signals: extractSignals(analyzed)
            };
        }

        fs.writeFileSync(
            "./data/competitive_memory.json",
            JSON.stringify(output, null, 2)
        );

        return output;
    }
}

module.exports = { CompetitorAgent };
