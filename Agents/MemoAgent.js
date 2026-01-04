const crypto = require("crypto");

class MemoAgent {
    constructor({ generateMemo, cache }) {
        this.generateMemo = generateMemo;
        this.cache = cache; // Using the injected cache module (llmcache style)
    }

    run(analyzedReviews) {
        if (!analyzedReviews || analyzedReviews.length === 0) {
            return "No reviews to generate memo from.";
        }

        const key = this.makeKey(analyzedReviews);
        console.log(`MemoAgent: key = ${key} `);

        // Try to get from cache
        const cached = this.cache.get(key);
        if (cached) {
            console.log("MemoAgent: returning cached memo");
            return cached;
        }

        console.log("MemoAgent: generating new memo");
        const memo = this.generateMemo(analyzedReviews);

        // Save to cache
        this.cache.set(key, memo);

        return memo;
    }

    makeKey(reviews) {
        // Create a deterministic key based on the content of the reviews
        return crypto
            .createHash("sha256")
            .update(JSON.stringify(reviews))
            .digest("hex");
    }
}

module.exports = { MemoAgent };
