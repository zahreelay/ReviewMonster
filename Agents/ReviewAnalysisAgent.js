class ReviewAnalysisAgent {
    constructor({ fetchReviews, analyzeReview, cache }) {
        this.fetchReviews = fetchReviews;
        this.analyzeReview = analyzeReview;
        this.cache = cache;
    }

    async run({ days }) {
        console.log("Fetching reviews... 1");

        const reviews = await this.fetchReviews(days);
        const results = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            console.log("Fetching reviews..10", key);

            let analysis = this.cache.get(key);
            if (!analysis) {
                analysis = await this.analyzeReview(review);
                console.log("Fetching reviews..11", analysis);
                this.cache.set(key, analysis);
            }
            analysis = JSON.parse(analysis);
            //console.log("Fetching reviews..12", review);
            //console.log("Fetching reviews..13", analysis);
            //process.exit(0);
            results.push({ ...review, ...analysis });
        }
        return results;
    }
}

module.exports = { ReviewAnalysisAgent };
