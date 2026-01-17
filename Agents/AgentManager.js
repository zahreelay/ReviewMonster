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

    async run({ days }) {
        const analyzed = await this.reviewAgent.run({ days });
        const memo = await this.memoAgent.run(analyzed);

        return {
            generatedAt: new Date().toISOString(),
            totalReviews: analyzed.length,
            analyzed,
            memo
        };
    }

    async runYearlyReport() {
        return await this.yearlyAgent.run();
    }
    async runRegressionTree() {
        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            throw new Error("Raw review store empty. Run /init with refresh=true first.");
        }

        const analyzed = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            let analysis = this.cache.get(key);
            analysis = JSON.parse(analysis);
            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }
            //console.log("Analysis:", analysis, review);
            analyzed.push({ ...review, ...analysis });
        }

        return buildRegressionTree(analyzed);
    }
    async runReleaseTimeline() {
        const reviews = rawStore.getReviews();

        if (!reviews.length) {
            throw new Error("Raw review store empty. Run /init with refresh=true first.");
        }

        const analyzed = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            let analysis = this.cache.get(key);
            analysis = JSON.parse(analysis);

            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }

            analyzed.push({ ...review, ...analysis });
        }

        return buildReleaseTimeline(analyzed);
    }

    async runImpactModel() {
        const regression = await this.runRegressionTree();
        const timeline = await this.runReleaseTimeline();

        return buildImpactModel(regression, timeline);
    }

    async runCompetitorInit({ appProfile, reviews, opts = {} }) {
        return await this.competitorAgent.discover(appProfile, reviews, opts);
    }

    async runCompetitorAnalysis({ appProfile, reviews, ourIntel, opts = {} }) {
        return await this.competitorAgent.run(appProfile, reviews, ourIntel, opts);
    }



}



module.exports = { AgentManager };
