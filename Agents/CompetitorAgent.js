const fs = require("fs");
const path = require("path");

const { discoverCompetitors } = require("../tools/competitorDiscovery");
const { ingestCompetitorReviews } = require("../tools/competitorIngestion");
const { extractSignals } = require("../tools/reviewSignalExtractor");

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

/**
 * Helper for SWOT aggregation
 */
function summarize(analyzed, key, limit = 5) {
    const freq = {};
    for (const r of analyzed) {
        const arr = Array.isArray(r[key]) ? r[key] : [];
        for (const v of arr) {
            const k = String(v).toLowerCase();
            freq[k] = (freq[k] || 0) + 1;
        }
    }
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([text, count]) => ({ text, count }));
}

class CompetitorAgent {
    constructor(tools) {
        if (!tools?.analyzeReview) {
            throw new Error("CompetitorAgent requires analyzeReview");
        }

        this.fetchReviews = tools.fetchReviews;
        this.analyzeReview = tools.analyzeReview;
        this.cache = tools.cache;
    }

    /**
     * STEP 1 — DISCOVERY ONLY
     */
    async discover(appProfile, reviews, opts = {}) {
        const competitors = await discoverCompetitors(appProfile, reviews, opts);
        return competitors.slice(0, opts.k || 10);
    }

    /**
     * STEP 2 — DATA PREPARATION (AUTO MODE)
     * Same pipeline as main app
     */
    async run(appProfile, reviews, ourIntel, opts = {}) {
        const days = opts.days || 90;

        const competitors = await discoverCompetitors(appProfile, reviews, opts);
        const top3 = competitors.slice(0, 3);

        const analyzeOne = async ({ appId, name }) => {
            const raw = await ingestCompetitorReviews(
                [{ appId, name }],
                this.fetchReviews,
                { days }
            );

            const reviews = raw?.[appId]?.reviews || [];
            const analyzed = [];

            for (const r of reviews) {
                const cacheKey = `analyze:${appId}:${r.text}`;
                let parsed = null;

                if (this.cache) {
                    const cached = this.cache.get(cacheKey);
                    if (cached) parsed = safeParseAnalysis(cached);
                }

                if (!parsed) {
                    const out = await this.analyzeReview(r);
                    parsed = safeParseAnalysis(out);
                    if (this.cache) this.cache.set(cacheKey, out);
                }

                analyzed.push({ ...r, ...parsed });
            }

            return { appId, name, reviews, analyzed };
        };

        const dataset = {
            generatedAt: new Date().toISOString(),
            windowDays: days,
            mainApp: await analyzeOne(appProfile),
            competitors: {}
        };

        for (const c of top3) {
            dataset.competitors[c.appId] = await analyzeOne(c);
        }

        fs.writeFileSync(
            path.join(__dirname, "../data/competitive_dataset.json"),
            JSON.stringify(dataset, null, 2)
        );

        return dataset;
    }

    /**
     * STEP 3 — EXPLICIT COMPARISON (BY APP IDS)
     */
    async compareByIds(mainApp, competitors, opts = {}) {
        const days = opts.days || 90;

        const analyzeOne = async ({ appId, name }) => {
            const raw = await ingestCompetitorReviews(
                [{ appId, name }],
                this.fetchReviews,
                { days }
            );

            const reviews = raw?.[appId]?.reviews || [];
            const analyzed = [];

            for (const r of reviews) {
                const out = await this.analyzeReview(r);
                analyzed.push({ ...r, ...safeParseAnalysis(out) });
            }

            return { appId, name, reviews, analyzed };
        };

        const dataset = {
            generatedAt: new Date().toISOString(),
            windowDays: days,
            mainApp: await analyzeOne(mainApp),
            competitors: {}
        };

        for (const c of competitors) {
            dataset.competitors[c.appId] = await analyzeOne(c);
        }

        fs.writeFileSync(
            path.join(__dirname, "../data/competitive_comparison.json"),
            JSON.stringify(dataset, null, 2)
        );

        return dataset;
    }

    /**
     * STEP 4 — SWOT INTELLIGENCE
     */
    compare(dataset) {
        const { mainApp, competitors } = dataset;
        const swot = {};

        for (const c of Object.values(competitors)) {
            swot[c.name] = {
                strengths: summarize(c.analyzed, "praise"),
                weaknesses: summarize(c.analyzed, "issues"),
                opportunities: summarize(c.analyzed, "requests"),
                threats: summarize(mainApp.analyzed, "praise")
            };
        }

        fs.writeFileSync(
            path.join(__dirname, "../data/competitive_swot.json"),
            JSON.stringify(swot, null, 2)
        );

        return swot;
    }
}

module.exports = { CompetitorAgent };
