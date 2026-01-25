const { ReviewAnalysisAgent } = require("./ReviewAnalysisAgent");
const { MemoAgent } = require("./MemoAgent");

const { YearlyReportAgent } = require("./YearlyReportAgent");
const rawStore = require("../tools/rawReviewStore");

const { buildRegressionTree } = require("../tools/regressionEngine");

const { buildReleaseTimeline } = require("../tools/releaseTimeline");

const { buildImpactModel } = require("../tools/impactModel");

const { CompetitorAgent } = require("./CompetitorAgent");



class AgentManager {
    constructor({ fetchReviews, analyzeReview, generateMemo, cache }) {
        this.reviewAgent = new ReviewAnalysisAgent({ fetchReviews, analyzeReview, cache });
        this.memoAgent = new MemoAgent({ generateMemo, cache });
        this.cache = cache;
        this.yearlyAgent = new YearlyReportAgent({
            rawStore,
            analyzeReview,
            cache,
            generateMemo
        });
        this.competitorAgent = new CompetitorAgent({
            fetchReviews,
            analyzeReview,
            cache
        });
    }

    async run({ days, bypassCache = false }) {
        const analyzed = await this.reviewAgent.run({ days, bypassCache });
        const memo = await this.memoAgent.run(analyzed, { bypassCache });

        return {
            generatedAt: new Date().toISOString(),
            totalReviews: analyzed.length,
            analyzed,
            memo
        };
    }

    async runYearlyReport({ bypassCache = false } = {}) {
        return await this.yearlyAgent.run({ bypassCache });
    }
    async runRegressionTree({ bypassCache = false } = {}) {
        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            throw new Error("Raw review store empty. Run /init with refresh=true first.");
        }

        const analyzed = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            let analysis = bypassCache ? null : this.cache.get(key);
            if (analysis) {
                analysis = JSON.parse(analysis);
            }
            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }
            analyzed.push({ ...review, ...analysis });
        }

        return buildRegressionTree(analyzed);
    }
    async runReleaseTimeline({ bypassCache = false } = {}) {
        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            throw new Error("Raw review store empty. Run /init with refresh=true first.");
        }

        const analyzed = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            let analysis = bypassCache ? null : this.cache.get(key);
            if (analysis) {
                analysis = JSON.parse(analysis);
            }

            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }

            analyzed.push({ ...review, ...analysis });
        }

        return buildReleaseTimeline(analyzed);
    }

    async runImpactModel({ bypassCache = false } = {}) {
        const regression = await this.runRegressionTree({ bypassCache });
        const timeline = await this.runReleaseTimeline({ bypassCache });

        return buildImpactModel(regression, timeline);
    }

    async runCompetitorInit({ appProfile, reviews, opts = {} }) {
        return await this.competitorAgent.discover(appProfile, reviews, opts);
    }

    async runCompetitorRun({ mainApp, competitorIds, days, bypassCache = false }) {
        return await this.competitorAgent.run(mainApp, competitorIds, days, { bypassCache });
    }
    async runCompetitorCompare({ mainApp, competitorIds, days }) {
        const fs = require("fs");
        const path = require("path");

        const datasetPath = path.join(
            __dirname,
            "../data/competitive_dataset.json"
        );

        if (!fs.existsSync(datasetPath)) {
            throw new Error("No dataset found. Run /competitors/run first.");
        }

        const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

        // Sanity: ensure dataset matches request
        if (
            dataset.mainApp.appId !== mainApp.appId ||
            competitorIds.some(id => !dataset.competitors[id])
        ) {
            throw new Error(
                "Dataset does not match supplied mainApp / competitorIds. Re-run /competitors/run."
            );
        }

        return this.competitorAgent.compare(dataset);
    }





}



module.exports = { AgentManager };
