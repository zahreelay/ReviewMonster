class InitAgent {
    constructor({ scraper, rawStore, analyzeReview, cache }) {
        this.scraper = scraper;
        this.rawStore = rawStore;
        this.analyzeReview = analyzeReview;
        this.cache = cache;
    }

    async run({ refresh = false, bypassCache = false }) {
        let reviews = this.rawStore.getReviews();

        if (refresh) {
            reviews = await this.scraper.scrapeLastYear();
            this.rawStore.saveReviews(reviews);
        }

        if (!reviews.length) {
            return {
                status: "no_data",
                message: "Raw store empty. Run with refresh=true first."
            };
        }

        const analyzed = [];

        for (const review of reviews) {
            const key = this.cache.makeReviewKey(review);
            let analysis = bypassCache ? null : this.cache.get(key);

            if (!analysis) {
                analysis = await this.analyzeReview(review);
                this.cache.set(key, analysis);
            }

            analyzed.push({
                ...analysis,
                rating: review.rating,
                date: review.date,
                version: review.version
            });
        }

        return {
            status: "ok",
            totalRawReviews: reviews.length,
            totalAnalyzed: analyzed.length,
            updatedAt: new Date().toISOString()
        };
    }
}

module.exports = { InitAgent };
