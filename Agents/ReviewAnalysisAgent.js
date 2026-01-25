class ReviewAnalysisAgent {
    constructor({ fetchReviews, analyzeReview, cache }) {
        this.fetchReviews = fetchReviews;
        this.analyzeReview = analyzeReview;
        this.cache = cache;
    }

    async run({ days, bypassCache = false }) {
        const reviews = await this.fetchReviews(days);
        const results = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);

            let analysis = bypassCache ? null : this.cache.get(key);
            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }
            analysis = JSON.parse(analysis);

            results.push({ ...review, ...analysis });
        }
        return results;
    }
}

module.exports = { ReviewAnalysisAgent };
