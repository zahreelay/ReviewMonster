const { ReviewAnalysisAgent } = require("./ReviewAnalysisAgent");
const { MemoAgent } = require("./MemoAgent");

class AgentManager {
    constructor({ fetchReviews, analyzeReview, generateMemo, cache }) {
        this.reviewAgent = new ReviewAnalysisAgent({ fetchReviews, analyzeReview, cache });
        this.memoAgent = new MemoAgent({ generateMemo, cache });
        this.cache = cache;
    }

    async run({ days }) {
        console.log("Fetching reviews...");
        const analyzed = await this.reviewAgent.run({ days });
        console.log("generating memo..1");

        //const key = this.cache.makeMemoKey(analyzed);
        //console.log("Fetching memo key..10", key);

        //let memo = this.cache.get(key);
        //console.log("Fetching memo..11", memo);
        //if (!memo) {
        const memo = await this.memoAgent.run(analyzed);
        //    this.cache.set(key, memo);
        //}

        return {
            generatedAt: new Date().toISOString(),
            totalReviews: analyzed.length,
            analyzed,
            memo
        };
    }
}

module.exports = { AgentManager };
