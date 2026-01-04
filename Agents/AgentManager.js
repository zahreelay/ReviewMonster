const { ReviewAnalysisAgent } = require("./ReviewAnalysisAgent");
const { MemoAgent } = require("./MemoAgent");

class AgentManager {
    constructor({ fetchReviews, analyzeReview, generateMemo, cache }) {
        this.reviewAgent = new ReviewAnalysisAgent({ fetchReviews, analyzeReview, cache });
        this.memoAgent = new MemoAgent({ generateMemo, cache });
        this.cache = cache;
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
}

module.exports = { AgentManager };
