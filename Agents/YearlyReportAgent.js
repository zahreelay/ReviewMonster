class YearlyReportAgent {
    constructor({ rawStore, analyzeReview, cache, generateMemo }) {
        this.rawStore = rawStore;
        this.analyzeReview = analyzeReview;
        this.cache = cache;
        this.generateMemo = generateMemo;
    }

    async run() {
        const reviews = this.rawStore.getReviews();

        if (!reviews.length) {
            throw new Error("Raw review store empty. Run /init with refresh=true first.");
        }

        const analyzed = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            let analysis = this.cache.get(key);

            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }

            analysis = JSON.parse(analysis);
            analyzed.push({
                ...review,
                ...analysis
            });
        }

        const memo = this.generateMemo(analyzed);
        console.log("Generated memo:", memo);

        return {
            generatedAt: new Date().toISOString(),
            totalReviews: analyzed.length,
            memo,
            scope: "1_year"
        };
    }
}

module.exports = { YearlyReportAgent };
