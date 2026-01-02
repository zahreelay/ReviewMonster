const crypto = require("crypto");
const { fetchRecentReviews } = require("../reviewFetcher");
const { understandReview, generateMemoV1 } = require("./reviewUnderstanding");
const { getCached, setCached } = require("../llmcache");

class ProductAgent {
    async ingestAndSummarize() {
        const reviews = await fetchRecentReviews(10);

        const enriched = [];
        for (const r of reviews) {
            const key = makeCacheKey(r);
            console.log(key);
            const cached = getCached(key);
            if (cached) {
                console.log("cached");
                enriched.push({ ...r, ...cached.value });
                continue;
            }
            console.log("not cached");

            const brain = await understandReview(r);
            enriched.push({ ...r, ...brain });
            setCached(key, brain);
        }

        const memo = generateMemoV1(enriched);
        return {
            meta: {
                days: 180,
                total_reviews: enriched.length
            },
            reviews: enriched,
            memo: memo
        };
    }
}

function makeCacheKey(review) {
    return crypto
        .createHash("sha256")
        .update(`${review.text}|${review.rating}|${review.version}`)
        .digest("hex");
}

module.exports = ProductAgent;
