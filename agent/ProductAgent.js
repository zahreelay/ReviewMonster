const { fetchRecentReviews } = require("../reviewFetcher");
const { understandReview } = require("./reviewUnderstanding");

class ProductAgent {
    async ingestAndSummarize() {
        const reviews = await fetchRecentReviews(10);

        const enriched = [];
        for (const r of reviews) {
            //console.log(r);
            const brain = await understandReview(r);
            //console.log(brain);
            //process.exit(0);
            enriched.push({ ...r, ...brain });

        }

        return {
            meta: {
                days: 180,
                total_reviews: enriched.length
            },
            reviews: enriched
        };
    }
}

module.exports = ProductAgent;
