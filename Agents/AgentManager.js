const { ReviewAnalysisAgent } = require("./ReviewAnalysisAgent");
const { MemoAgent } = require("./MemoAgent");

const { YearlyReportAgent } = require("./YearlyReportAgent");
const rawStore = require("../tools/rawReviewStore");


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

}

module.exports = { AgentManager };
