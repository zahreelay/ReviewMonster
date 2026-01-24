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
 * @param analyzed - array of analyzed reviews with { intent, issues, ... }
 * @param intentFilter - filter by intent: "complaint", "feature_request", "praise", or null for all
 * @param limit - max items to return
 */
function summarize(analyzed, intentFilter = null, limit = 5) {
    const freq = {};
    for (const r of analyzed) {
        // Filter by intent if specified
        if (intentFilter && r.intent !== intentFilter) continue;

        const arr = Array.isArray(r.issues) ? r.issues : [];
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
    async run(mainApp, competitorIds, days) {
        // const competitors = await discoverCompetitors(appProfile, reviews, opts);
        // const top3 = competitors.slice(0, 3);

        if (!mainApp?.appId) {
            throw new Error("appProfile.appId is required");
        }

        if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
            throw new Error(
                "CompetitorAgent.run requires competitorIds[] from API"
            );
        }

        const competitors = competitorIds.map(id => ({
            appId: id,
            name: id // name can be enriched later via lookup if needed
        }));

        //console.log("Competitors:", competitors);
        //process.exit(0);
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
                    if (cached) {
                        //console.log("Cache hit:", cacheKey);
                        //process.exit(0);
                        parsed = safeParseAnalysis(cached);
                    }
                }

                if (!parsed) {
                    const out = await this.analyzeReview(r);
                    parsed = safeParseAnalysis(out);
                    if (this.cache) this.cache.set(cacheKey, out);
                }

                analyzed.push({ ...r, ...parsed });
            }
            //console.log("Analyzed:", analyzed);
            //process.exit(0);
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
                weaknesses: summarize(c.analyzed, "complaint"),
                opportunities: summarize(c.analyzed, "feature_request"),
                threats: summarize(mainApp.analyzed, "praise")
            };
        }
        //console.log("SWOT:", swot);
        //process.exit(0);
        fs.writeFileSync(
            path.join(__dirname, "../data/competitive_swot.json"),
            JSON.stringify(swot, null, 2)
        );

        return swot;
    }
}

module.exports = { CompetitorAgent };
